import { Platform } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as ImageManipulator from 'expo-image-manipulator';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { decode } from 'base64-arraybuffer';
import { supabase } from './supabase';

// ---------- Přihlášení (Apple, zdarma) ----------

export async function appleAvailable() {
  if (Platform.OS !== 'ios') return false;
  try {
    return await AppleAuthentication.isAvailableAsync();
  } catch (e) {
    return false;
  }
}

export async function signInWithApple() {
  const cred = await AppleAuthentication.signInAsync({
    requestedScopes: [AppleAuthentication.AppleAuthenticationScope.FULL_NAME],
  });
  if (!cred.identityToken) throw new Error('Apple nevrátil přihlašovací token.');
  const { data, error } = await supabase.auth.signInWithIdToken({ provider: 'apple', token: cred.identityToken });
  if (error) throw error;
  // Apple pošle jméno jen při úplně prvním přihlášení
  const given = cred.fullName && (cred.fullName.givenName || cred.fullName.nickname);
  if (given) await supabase.from('profiles').update({ name: given }).eq('id', data.user.id);
  return data.session;
}

export async function signOut() {
  await supabase.auth.signOut();
}

export async function deleteAccount() {
  const { error } = await supabase.rpc('delete_account');
  if (error) throw error;
  await supabase.auth.signOut();
}

// ---------- Profil a kontakt ----------

export async function getProfile(uid) {
  const { data } = await supabase.from('profiles').select('*').eq('id', uid).maybeSingle();
  return data;
}

export async function updateName(uid, name) {
  const { error } = await supabase.from('profiles').update({ name }).eq('id', uid);
  if (error) throw error;
}

export async function claimWelcome() {
  await supabase.rpc('claim_welcome');
}

export async function getMyContact(uid) {
  const { data } = await supabase.from('contacts').select('*').eq('user_id', uid).maybeSingle();
  return data;
}

export async function saveContact(uid, contact) {
  const { error } = await supabase
    .from('contacts')
    .upsert({ user_id: uid, methods: contact.methods, phone: contact.phone, messenger: contact.messenger, updated_at: new Date().toISOString() });
  if (error) throw error;
}

// ---------- Věci ----------

export async function fetchFeed(lat, lng, km = 20) {
  const { data, error } = await supabase.rpc('nearby_items', { p_lat: lat, p_lng: lng, p_km: km });
  if (error) throw error;
  return data || [];
}

export async function fetchMyItems(uid) {
  const { data, error } = await supabase
    .from('items')
    .select('*, requests(id, status)')
    .eq('owner_id', uid)
    .neq('status', 'hidden')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

async function uploadPhoto(uid, uri) {
  const small = await ImageManipulator.manipulateAsync(uri, [{ resize: { width: 1200 } }], {
    compress: 0.7,
    format: ImageManipulator.SaveFormat.JPEG,
    base64: true,
  });
  const path = `${uid}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
  const { error } = await supabase.storage.from('photos').upload(path, decode(small.base64), { contentType: 'image/jpeg' });
  if (error) throw error;
  return supabase.storage.from('photos').getPublicUrl(path).data.publicUrl;
}

export async function createItem(uid, item) {
  const photos = [];
  for (const uri of item.photos || []) photos.push(await uploadPhoto(uid, uri));
  const { data, error } = await supabase
    .from('items')
    .insert({
      owner_id: uid,
      title: item.title,
      description: item.description || null,
      category: item.category || null,
      pickup: item.pickup || null,
      photos,
      lat: item.lat,
      lng: item.lng,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteItem(id) {
  const { error } = await supabase.from('items').delete().eq('id', id);
  if (error) throw error;
}

export async function markGiven(id) {
  const { error } = await supabase.rpc('mark_given', { p_item: id });
  if (error) throw error;
}

export async function incrementView(id) {
  await supabase.rpc('increment_view', { p_item: id });
}

// ---------- Žádosti ----------

export async function requestItem(uid, itemId, message) {
  const { error } = await supabase.from('requests').insert({ item_id: itemId, requester_id: uid, message });
  if (error) throw error;
}

export async function fetchOutgoing(uid) {
  const { data, error } = await supabase
    .from('requests')
    .select('id, status, created_at, item:items(id, title, photos, status, owner_id, lat, lng, description, pickup, category, created_at, owner:profiles(name))')
    .eq('requester_id', uid)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function fetchIncoming(uid) {
  const { data, error } = await supabase
    .from('requests')
    .select('id, status, message, created_at, item_id, requester:profiles(id, name), item:items!inner(id, title, owner_id, photos)')
    .eq('item.owner_id', uid)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function acceptRequest(id) {
  const { error } = await supabase.rpc('accept_request', { p_request: id });
  if (error) throw error;
}

export async function declineRequest(id) {
  const { error } = await supabase.rpc('decline_request', { p_request: id });
  if (error) throw error;
}

export async function getContact(itemId) {
  const { data, error } = await supabase.rpc('get_contact', { p_item: itemId });
  if (error) throw error;
  return (data && data[0]) || null;
}

// ---------- Bezpečnost ----------

export async function reportItem(uid, itemId, reason) {
  const { error } = await supabase.from('reports').insert({ item_id: itemId, reporter_id: uid, reason });
  if (error && error.code !== '23505') throw error; // už nahlášeno
}

export async function blockUser(uid, otherId) {
  const { error } = await supabase.from('blocks').insert({ blocker_id: uid, blocked_id: otherId });
  if (error && error.code !== '23505') throw error;
}

// ---------- Push notifikace ----------

export async function registerPush(uid) {
  try {
    if (!Device.isDevice) return;
    let { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') status = (await Notifications.requestPermissionsAsync()).status;
    if (status !== 'granted') return;
    const projectId = Constants.expoConfig?.extra?.eas?.projectId || Constants.easConfig?.projectId;
    const token = (await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined)).data;
    await supabase.from('push_tokens').upsert({ token, user_id: uid, updated_at: new Date().toISOString() });
  } catch (e) {
    // bez notifikací appka funguje dál
  }
}

export async function fetchNotifications(uid) {
  const { data } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', uid)
    .order('created_at', { ascending: false })
    .limit(50);
  return data || [];
}

export async function markNotificationsRead(uid) {
  await supabase.from('notifications').update({ read: true }).eq('user_id', uid).eq('read', false);
}
