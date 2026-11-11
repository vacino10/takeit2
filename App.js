// TAKE.it – Pošli to dál.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TurboModuleRegistry,
  Pressable,
  Animated,
  Easing,
  ScrollView,
  TextInput,
  Image,
  Modal,
  PanResponder,
  ActivityIndicator,
  Dimensions,
  Platform,
  Alert,
  KeyboardAvoidingView,
  StatusBar,
  Linking,
  Share,
  RefreshControl,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import * as Location from 'expo-location';
import * as AppleAuthentication from 'expo-apple-authentication';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import * as StoreReview from 'expo-store-review';
import MapViewNative, { Marker as MarkerNative, Circle as CircleNative } from 'react-native-maps';
import { supabase, isConfigured } from './src/supabase';
import * as api from './src/api';
import { SUPPORT_EMAIL, TERMS_URL, PRIVACY_URL } from './src/config';

const MapView = MapViewNative;
const Marker = MarkerNative;
const MapCircle = CircleNative;

// Notifikace se ukazují i když je appka otevřená
try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
} catch (e) {}

// ---------- Brand ----------
const B = '#7028E8';
const B_LIGHT = '#F1EBFF';
const INK = '#111111';
const SUB = '#8A8A8E';
const CARD = '#F6F6F8';
const GREEN = '#1DB954';
const W = Dimensions.get('window').width;

const tap = () => {
  try { Haptics.selectionAsync().catch(() => {}); } catch (e) {}
};
const impact = (style = 'Light') => {
  try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle[style]).catch(() => {}); } catch (e) {}
};
const success = () => {
  try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}); } catch (e) {}
};
// Souvislá vibrace, která plynule sílí – Core Haptics přes Pulsar (react-native-pulsar).
// Funguje jen v buildu (TestFlight / App Store). V Expo Go a Snacku nativní modul chybí,
// takže se použije jednodušší varianta: jemné ťuknutí na začátku a potvrzení na konci.
let PULSAR = null;
try {
  PULSAR = TurboModuleRegistry.get('RNPulsar');
  if (PULSAR) PULSAR.PatternComposer_play; // obejití cache prototypu v RN (podle Pulsaru)
} catch (e) {
  PULSAR = null;
}
const PEAK = { Soft: 0.35, Light: 0.5, Medium: 0.65, Rigid: 0.85, Heavy: 1 };
const rumble = (ms = 800, { peak, end = null, delay = 0 } = {}) => {
  const top = PEAK[peak || (ms < 500 ? 'Medium' : 'Heavy')] || 1;
  const timers = [];
  let id = -1;
  let released = false;
  const release = () => {
    if (id === -1 || released) return;
    released = true;
    try {
      PULSAR.PatternComposer_stop(id);
      PULSAR.PatternComposer_release(id);
    } catch (e) {}
  };
  if (PULSAR) {
    try {
      id = PULSAR.PatternComposer_parsePattern({
        discretePattern: [{ time: ms, amplitude: top, frequency: 0.6 }],
        continuousPattern: {
          amplitude: [
            { time: 0, value: 0.05 },
            { time: Math.round(ms * 0.6), value: top * 0.5 },
            { time: ms, value: top },
          ],
          frequency: [
            { time: 0, value: 0.25 },
            { time: ms, value: 0.7 },
          ],
        },
      });
      timers.push(setTimeout(() => { try { PULSAR.PatternComposer_play(id); } catch (e) {} }, delay));
      timers.push(setTimeout(release, delay + ms + 600));
    } catch (e) {
      id = -1;
    }
  }
  if (id === -1) timers.push(setTimeout(() => impact('Soft'), delay));
  if (end) timers.push(setTimeout(() => (end === 'success' ? success() : impact(end)), delay + ms + 40));
  return () => {
    timers.forEach(clearTimeout);
    release();
  };
};
const kc = (n) => n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

// ---------- Data ----------
const CENTER = { latitude: 50.083, longitude: 14.43 }; // Praha, když není poloha

const CATEGORIES = [
  ['🛋️', 'Nábytek'], ['📱', 'Elektronika'], ['👕', 'Oblečení'], ['🧸', 'Pro děti'],
  ['📚', 'Knihy'], ['⚽', 'Sport'], ['🍳', 'Domácnost'], ['🪴', 'Zahrada'],
  ['🐾', 'Zvířata'], ['🎨', 'Hobby'],
];
const CAT_GRAD = {
  Nábytek: ['#EFE8FF', '#D9CCFF'], Elektronika: ['#FFF1E6', '#FFDCC2'], Oblečení: ['#EAF0FF', '#CFDCFF'],
  'Pro děti': ['#FFF0E8', '#FFD7C2'], Knihy: ['#FDEBEC', '#F9CDD0'], Sport: ['#E6F6FF', '#C9E9FF'],
  Domácnost: ['#F2F2F2', '#E0E0E0'], Zahrada: ['#E8F8EC', '#C8EDD2'], Zvířata: ['#FFF9E0', '#FFEFA8'], Hobby: ['#E6FAF6', '#C4EFE6'],
};
const CAT_ICON = {
  Nábytek: 'bed-outline', Elektronika: 'phone-portrait-outline', Oblečení: 'shirt-outline', 'Pro děti': 'happy-outline',
  Knihy: 'book-outline', Sport: 'football-outline', Domácnost: 'home-outline', Zahrada: 'leaf-outline', Zvířata: 'paw-outline', Hobby: 'color-palette-outline',
};
const Ico = ({ name, size = 18, color = INK, style }) => <Ionicons name={name} size={size} color={color} style={style} />;
// Řádek s ikonou a textem (místo emoji)
const IconLine = ({ icon, text, color = SUB, style, bold }) => (
  <View style={[{ flexDirection: 'row', alignItems: 'center' }, style]}>
    <Ionicons name={icon} size={15} color={color} />
    <Text style={[st.chartAxis, { marginLeft: 6, flex: 1, color }, bold && { fontWeight: '700' }]}>{text}</Text>
  </View>
);
// Proč někdo hledá věci zdarma (ukáže se dárci u žádosti)
const TAKE_REASONS = [
  ['home-outline', 'Zařizuju nové bydlení', '🏠'],
  ['happy-outline', 'Mám malé děti', '👶'],
  ['school-outline', 'Jsem student', '🎓'],
  ['wallet-outline', 'Potřebuju ušetřit', '💸'],
  ['leaf-outline', 'Nechci kupovat nové', '♻️'],
  ['people-outline', 'Sháním pro někoho jiného', '🤝'],
];
const reasonIcon = (l) => (TAKE_REASONS.find((r) => r[1] === l) || ['heart-outline'])[0];
const catEmoji = (c) => (CATEGORIES.find((x) => x[1] === c) || ['🎁'])[0];

// Ukázkové věci jen pro úvodní obrazovku (ilustrace)
const PHOTO_IDS = {
  Pohovka: 'photo-1555041469-a586c61ea9bc',
  'Dětské kolo': 'photo-1485965120184-e220f721d03e',
  'Monitor 24"': 'photo-1527443224154-c4a3942d3acf',
  Kávovar: 'photo-1517668808822-9ebb02f2a0e6',
  Monstera: 'photo-1614594975525-e45190c55d0b',
  'Stolní lampa': 'photo-1507473885765-e6ed057f782c',
  'Krabice knih': 'photo-1512820790803-83ca734da794',
  'Zimní bunda': 'photo-1551028719-00167b16eac5',
  Plyšáci: 'photo-1559454403-b8fb88521f11',
  'Jídelní židle': 'photo-1503602642458-232111445657',
  Sluchátka: 'photo-1505740420928-5e560c06d30e',
  'Sada hrnků': 'photo-1514228742587-6b1558fcca3d',
};
const photo = (id) => `https://images.unsplash.com/${id}?w=700&q=70&auto=format&fit=crop`;
const ITEMS = [
  { t: 'Pohovka', e: '🛋️', km: '1,2', m: 8, g: ['#EFE8FF', '#D9CCFF'] },
  { t: 'Dětské kolo', e: '🚲', km: '2,4', m: 14, g: ['#E6F6FF', '#C9E9FF'] },
  { t: 'Monitor 24"', e: '🖥️', km: '0,8', m: 3, g: ['#FFF1E6', '#FFDCC2'] },
  { t: 'Kávovar', e: '☕', km: '3,1', m: 21, g: ['#F2F2F2', '#E0E0E0'] },
  { t: 'Monstera', e: '🪴', km: '1,7', m: 11, g: ['#E8F8EC', '#C8EDD2'] },
  { t: 'Stolní lampa', e: '💡', km: '4,0', m: 26, g: ['#FFF9E0', '#FFEFA8'] },
  { t: 'Krabice knih', e: '📚', km: '2,2', m: 9, g: ['#FDEBEC', '#F9CDD0'] },
  { t: 'Zimní bunda', e: '🧥', km: '5,3', m: 33, g: ['#EAF0FF', '#CFDCFF'] },
  { t: 'Plyšáci', e: '🧸', km: '1,1', m: 5, g: ['#FFF0E8', '#FFD7C2'] },
  { t: 'Jídelní židle', e: '🪑', km: '3,8', m: 18, g: ['#F4EDE6', '#E6D6C6'] },
  { t: 'Sluchátka', e: '🎧', km: '2,9', m: 12, g: ['#EEE8FF', '#DCCFFF'] },
  { t: 'Sada hrnků', e: '🍵', km: '0,6', m: 2, g: ['#E6FAF6', '#C4EFE6'] },
].map((it) => ({ ...it, img: PHOTO_IDS[it.t] ? photo(PHOTO_IDS[it.t]) : null }));

const CONTACTS = [
  { id: 'whatsapp', label: 'WhatsApp', e: '💬', icon: 'logo-whatsapp', color: '#25D366', field: 'phone' },
  { id: 'sms', label: 'SMS', e: '✉️', icon: 'chatbubble-ellipses-outline', color: '#FF9500', field: 'phone' },
  { id: 'messenger', label: 'Messenger', e: '⚡', icon: 'chatbubbles-outline', color: '#0084FF', field: 'messenger' },
  { id: 'phone', label: 'Zavolat', e: '📞', icon: 'call-outline', color: '#34C759', field: 'phone' },
];

// facebook.com/jmeno, fb.com/jmeno, m.me/jmeno nebo jen "jmeno" → odkaz do Messengeru
const messengerUrl = (raw) => {
  const v = (raw || '').trim();
  const pid = v.match(/profile\.php\?id=(\d+)/);
  if (pid) return `https://m.me/${pid[1]}`;
  const m = v.match(/(?:facebook\.com|fb\.com|m\.me|messenger\.com\/t)\/([^/?#\s]+)/i);
  const user = m ? m[1] : v.replace(/^@/, '');
  return `https://m.me/${user}`;
};
const isFbLink = (raw) => /(facebook\.com|fb\.com|m\.me|messenger\.com)\/[^\s]+/i.test((raw || '').trim());

function openContact(method, item, c) {
  if (!c) return;
  const msg = `Ahoj, mám zájem o „${item.t}“ z TAKE.it. Je to ještě k dispozici? 🙂`;
  const enc = encodeURIComponent(msg);
  const digits = (c.phone || '').replace(/[^0-9+]/g, '');
  const wa = digits.replace(/^\+/, '');
  let url = null;
  if (method === 'whatsapp') url = `https://wa.me/${wa}?text=${enc}`;
  if (method === 'messenger') url = messengerUrl(c.messenger);
  if (method === 'phone') url = `tel:${digits}`;
  if (method === 'sms') url = Platform.OS === 'ios' ? `sms:${digits}&body=${enc}` : `sms:${digits}?body=${enc}`;
  if (!url) return;
  Linking.openURL(url).catch(() => Alert.alert('Nejde otevřít', 'Tuhle appku nemáš v telefonu nainstalovanou.'));
}

// Čas a vzdálenost pro lidi
const ago = (ts) => {
  const min = Math.floor((Date.now() - new Date(ts).getTime()) / 60000);
  if (min < 1) return 'právě teď';
  if (min < 60) return `před ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `před ${h} h`;
  const d = Math.floor(h / 24);
  if (d === 1) return 'včera';
  return d < 5 ? `před ${d} dny` : `před ${d} dny`;
};
const kmText = (d) => (d == null ? 'v okolí' : d < 1 ? `${Math.max(100, Math.round(d * 10) * 100)} m` : `${d.toFixed(1).replace('.', ',')} km`);

// Řádek z databáze → věc pro UI
function mapItem(r, myId) {
  const photos = r.photos || [];
  const it = {
    id: r.id,
    owner_id: r.owner_id,
    owner_name: r.owner_name || (r.owner && r.owner.name) || 'Soused',
    t: r.title,
    d: r.description,
    cat: r.category,
    chip: r.pickup,
    photos,
    uri: photos[0],
    lat: r.lat,
    lng: r.lng,
    status: r.status,
    views: r.views || 0,
    created_at: r.created_at,
    distance: r.distance_km,
    kmText: kmText(r.distance_km),
    own: !!myId && r.owner_id === myId,
    e: catEmoji(r.category),
    g: CAT_GRAD[r.category] || [B_LIGHT, '#DCCFFF'],
    requests: r.requests || [],
  };
  it.meta = `${it.kmText} • ${ago(r.created_at)}`;
  return it;
}


// ---------- UI základ ----------
const LOGO_IMG = require('./assets/logo-wordmark.png');
const LOGO_RATIO = 3.6255;
function Logo({ size = 40, color = B }) {
  const h = size * 0.82;
  return <Image source={LOGO_IMG} style={{ height: h, width: h * LOGO_RATIO, tintColor: color }} resizeMode="contain" accessibilityLabel="TAKE.it" />;
}

function AppIcon({ size = 120 }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.24,
        backgroundColor: B,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: B,
        shadowOpacity: 0.35,
        shadowRadius: 20,
        shadowOffset: { width: 0, height: 10 },
        elevation: 10,
      }}
    >
      <View
        style={{
          width: size * 0.32,
          height: size * 0.18,
          borderWidth: size * 0.055,
          borderBottomWidth: 0,
          borderColor: '#fff',
          borderTopLeftRadius: size * 0.2,
          borderTopRightRadius: size * 0.2,
        }}
      />
      <View
        style={{
          width: size * 0.64,
          height: size * 0.4,
          backgroundColor: '#fff',
          borderRadius: size * 0.06,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ color: B, fontWeight: '900', fontStyle: 'italic', fontSize: size * 0.13 }}>
          TAKE.IT
        </Text>
      </View>
    </View>
  );
}

function FadeIn({ children, delay = 0, style }) {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(a, {
      toValue: 1,
      duration: 450,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, []);
  return (
    <Animated.View
      style={[
        style,
        {
          opacity: a,
          transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

function Button({ title, onPress, disabled, light, style }) {
  return (
    <Pressable
      disabled={disabled}
      onPress={() => {
        impact('Medium');
        onPress && onPress();
      }}
      style={({ pressed }) => [
        st.btn,
        light && st.btnLight,
        disabled && st.btnDis,
        pressed && { transform: [{ scale: 0.98 }], opacity: 0.92 },
        style,
      ]}
    >
      <Text style={[st.btnTxt, light && { color: B }]}>{title}</Text>
    </Pressable>
  );
}

function Option({ label, emoji, selected, onPress, delay = 0 }) {
  const pop = useRef(new Animated.Value(1)).current;
  return (
    <FadeIn delay={delay}>
      <Animated.View style={{ transform: [{ scale: pop }] }}>
        <Pressable
          onPress={() => {
            impact('Light');
            pop.setValue(0.94);
            Animated.spring(pop, { toValue: 1, friction: 3, tension: 160, useNativeDriver: true }).start();
            onPress();
          }}
          style={[st.option, selected && st.optionSel]}
        >
          <Text style={[st.optionTxt, selected && { color: B }]}>
            {emoji ? emoji + '  ' : ''}
            {label}
          </Text>
          {selected ? (
            <View style={st.optCheck}>
              <Text style={{ color: '#fff', fontSize: 12, fontWeight: '900' }}>✓</Text>
            </View>
          ) : null}
        </Pressable>
      </Animated.View>
    </FadeIn>
  );
}

function Confetti({ run, count = 28 }) {
  const parts = useRef(
    Array.from({ length: count }, (_, i) => ({
      a: new Animated.Value(0),
      dx: (Math.random() - 0.5) * W * 0.95,
      dy: -120 - Math.random() * 220,
      rot: (Math.random() - 0.5) * 720,
      e: ['🎉', '✨', '💜', '⭐', '🎁', '🟣'][i % 6],
    }))
  ).current;
  useEffect(() => {
    if (!run) return;
    const stop = rumble(520, { peak: 'Medium' });
    Animated.stagger(
      14,
      parts.map((p) => Animated.timing(p.a, { toValue: 1, duration: 2100, easing: Easing.out(Easing.quad), useNativeDriver: true }))
    ).start();
    return stop;
  }, [run]);
  if (!run) return null;
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
      {parts.map((p, i) => (
        <Animated.Text
          key={i}
          style={{
            position: 'absolute',
            fontSize: 22,
            opacity: p.a.interpolate({ inputRange: [0, 0.7, 1], outputRange: [1, 1, 0] }),
            transform: [
              { translateX: p.a.interpolate({ inputRange: [0, 1], outputRange: [0, p.dx] }) },
              { translateY: p.a.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, p.dy, p.dy + 260] }) },
              { rotate: p.a.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${p.rot}deg`] }) },
            ],
          }}
        >
          {p.e}
        </Animated.Text>
      ))}
    </View>
  );
}

function PointsPill({ points }) {
  const prev = useRef(points);
  const bump = useRef(new Animated.Value(1)).current;
  const fly = useRef(new Animated.Value(0)).current;
  const [diff, setDiff] = useState(0);
  useEffect(() => {
    const d = points - prev.current;
    prev.current = points;
    if (d <= 0) return;
    setDiff(d);
    bump.setValue(1.3);
    Animated.spring(bump, { toValue: 1, friction: 3, useNativeDriver: true }).start();
    fly.setValue(0);
    rumble(300, { peak: 'Medium' });
    Animated.timing(fly, { toValue: 1, duration: 1300, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [points]);
  return (
    <View style={{ marginLeft: 10 }}>
      <Animated.View style={[st.pointsPill, { transform: [{ scale: bump }] }]}>
        <Text style={{ fontWeight: '900', color: B }}>⭐ {points}</Text>
      </Animated.View>
      {diff ? (
        <Animated.Text
          pointerEvents="none"
          style={{
            position: 'absolute',
            right: 6,
            top: 0,
            fontWeight: '900',
            color: B,
            opacity: fly.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 1, 0] }),
            transform: [{ translateY: fly.interpolate({ inputRange: [0, 1], outputRange: [20, 34] }) }],
          }}
        >
          +{diff}
        </Animated.Text>
      ) : null}
    </View>
  );
}

function StepLayout({ title, subtitle, children, cta = 'Pokračovat', disabled, onNext, secondary, onSecondary, center }) {
  return (
    <View style={{ flex: 1, paddingHorizontal: 24 }}>
      {title ? (
        <FadeIn>
          <Text style={st.h1}>{title}</Text>
          {subtitle ? <Text style={st.sub}>{subtitle}</Text> : null}
        </FadeIn>
      ) : null}
      <View style={{ flex: 1, justifyContent: center ? 'center' : 'flex-start', paddingTop: 20 }}>
        {children}
      </View>
      {secondary ? (
        <Pressable onPress={onSecondary} hitSlop={10}>
          <Text style={st.secondary}>{secondary}</Text>
        </Pressable>
      ) : null}
      {cta ? <Button title={cta} disabled={disabled} onPress={onNext} /> : null}
    </View>
  );
}

function Slider({ value, min, max, onChange }) {
  const ref = useRef(null);
  const box = useRef({ x: 0, w: 1 });
  const cb = useRef(onChange);
  cb.current = onChange;
  const last = useRef(value);
  const handle = (pageX) => {
    const { x, w } = box.current;
    let p = (pageX - x - 18) / Math.max(1, w - 36);
    p = Math.max(0, Math.min(1, p));
    const v = Math.round(min + p * (max - min));
    if (v !== last.current) {
      last.current = v;
      tap();
      cb.current(v);
    }
  };
  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (e) => handle(e.nativeEvent.pageX),
      onPanResponderMove: (e, g) => handle(g.moveX),
    })
  ).current;
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <View
      ref={ref}
      collapsable={false}
      onLayout={() =>
        ref.current &&
        ref.current.measureInWindow((x, y, w) => {
          box.current = { x, w: w || 1 };
        })
      }
      {...pan.panHandlers}
      style={{ height: 48, justifyContent: 'center' }}
    >
      <View style={{ marginHorizontal: 18 }}>
        <View style={{ height: 8, borderRadius: 4, backgroundColor: '#ECECF0' }}>
          <View style={{ width: `${pct}%`, height: 8, borderRadius: 4, backgroundColor: B }} />
        </View>
        <View pointerEvents="none" style={[st.thumb, { left: `${pct}%`, top: -14 }]} />
      </View>
    </View>
  );
}

// Fotka věci (vlastní fotka > ukázková fotka > emoji jako záloha)
function Thumb({ item, style, emojiSize = 30, src, children }) {
  const [err, setErr] = useState(false);
  const uri = src || item.uri || item.img;
  return (
    <LinearGradient colors={item.g || [B_LIGHT, '#DCCFFF']} style={[{ alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }, style]}>
      {uri && !err ? (
        <Image source={{ uri }} style={StyleSheet.absoluteFill} resizeMode="cover" onError={() => setErr(true)} />
      ) : (
        <Text style={{ fontSize: emojiSize }}>{item.e}</Text>
      )}
      {children}
    </LinearGradient>
  );
}

function ItemCard({ item, i = 0, onPress }) {
  const size = (W - 48 - 12) / 2;
  return (
    <FadeIn delay={Math.min(i, 8) * 60} style={{ width: size, marginBottom: 12 }}>
      <Pressable onPress={onPress} style={st.itemCard}>
        <Thumb item={item} emojiSize={size * 0.34} style={{ height: size * 0.9 }}>
          <View style={st.freeBadge}>
            <Text style={[st.freeBadgeTxt, item.badgeColor && { color: item.badgeColor }]}>{item.badge || 'ZDARMA'}</Text>
          </View>
        </Thumb>
        <View style={{ padding: 10 }}>
          <Text style={st.itemTitle} numberOfLines={1}>{item.t}</Text>
          <Text style={st.itemMeta}>{item.meta || `${item.km} km • před ${item.m} min`}</Text>
        </View>
      </Pressable>
    </FadeIn>
  );
}

function Grid({ items, onItem }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
      {items.map((it, i) => (
        <ItemCard key={it.t + i} item={it} i={i} onPress={onItem ? () => onItem(it) : undefined} />
      ))}
    </View>
  );
}


// ---------- Taki – průvodce (krokodýl) ----------
// mood: happy | wow | wink | excited | think
function Taki({ size = 120, mood = 'happy', wave = false, jump = 0 }) {
  const bob = useRef(new Animated.Value(0)).current;
  const hop = useRef(new Animated.Value(0)).current;
  const arm = useRef(new Animated.Value(0)).current;
  const [blink, setBlink] = useState(false);
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(bob, { toValue: 1, duration: 1300, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(bob, { toValue: 0, duration: 1300, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();
    let t;
    const loop = () => {
      t = setTimeout(() => {
        setBlink(true);
        setTimeout(() => setBlink(false), 140);
        loop();
      }, 2200 + Math.random() * 2400);
    };
    loop();
    return () => clearTimeout(t);
  }, []);
  useEffect(() => {
    if (!wave) return arm.setValue(0);
    const a = Animated.loop(
      Animated.sequence([
        Animated.timing(arm, { toValue: 1, duration: 260, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(arm, { toValue: -1, duration: 260, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
      { iterations: 4 }
    );
    a.start();
    return () => a.stop();
  }, [wave]);
  useEffect(() => {
    if (!jump) return;
    impact('Soft');
    hop.setValue(0);
    Animated.sequence([
      Animated.timing(hop, { toValue: 1, duration: 160, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.spring(hop, { toValue: 0, friction: 4, tension: 120, useNativeDriver: true }),
    ]).start();
  }, [jump]);
  const k = size / 120;
  // Taki: roztomilý krokodýl složený z obyčejných tvarů (bez SVG), mřížka 120 × 140
  const box = (x, y, w, h, extra) => ({ position: 'absolute', left: x * k, top: y * k, width: w * k, height: h * k, ...extra });
  const G = '#5BCB8F';
  const GD = '#2E9B66';
  const SNOUT = '#7EDCAA';
  const CREAM = '#FFF1C2';
  const M = '#1D5B3D';
  const arc = (x, y, w, h, color, thick) => (
    <View style={box(x, y, w, h, { borderBottomWidth: thick * k, borderLeftWidth: thick * 0.6 * k, borderRightWidth: thick * 0.6 * k, borderColor: color, borderBottomLeftRadius: w * k, borderBottomRightRadius: w * k, borderTopWidth: 0 })} />
  );
  const tooth = (x, y, key) => (
    <View key={key} style={{ position: 'absolute', left: x * k, top: y * k, width: 0, height: 0, borderLeftWidth: 3 * k, borderRightWidth: 3 * k, borderTopWidth: 5 * k, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: '#FFFFFF' }} />
  );
  const ly = mood === 'think' ? -3 : 0;
  const eye = (cx, closed) =>
    closed ? (
      arc(cx - 7, 15, 14, 7, M, 3)
    ) : (
      <>
        <View style={box(cx - 4.5, (mood === 'wow' ? 13 : 14) + ly, 9, mood === 'wow' ? 13 : 11, { backgroundColor: '#14301F', borderRadius: 5 * k })} />
        <View style={box(cx - 2, 15.5 + ly, 3.5, 3.5, { backgroundColor: '#FFFFFF', borderRadius: 2 * k })} />
      </>
    );
  let mouth = (
    <>
      {arc(30, 58, 60, 13, M, 3)}
      {[[38, 64], [48, 68], [66, 68], [76, 64]].map(([x, y], i) => tooth(x, y, 't' + i))}
    </>
  );
  if (mood === 'wow') mouth = <View style={box(54, 62, 12, 12, { backgroundColor: M, borderRadius: 6 * k })} />;
  if (mood === 'excited')
    mouth = (
      <>
        <View style={box(38, 61, 44, 15, { backgroundColor: M, borderBottomLeftRadius: 14 * k, borderBottomRightRadius: 14 * k, overflow: 'hidden' })}>
          <View style={{ position: 'absolute', left: 12 * k, top: 8 * k, width: 20 * k, height: 10 * k, borderRadius: 6 * k, backgroundColor: '#FF8FB1' }} />
        </View>
        {tooth(45, 61, 'e1')}
        {tooth(69, 61, 'e2')}
      </>
    );
  if (mood === 'think') mouth = <View style={box(48, 66, 24, 3, { backgroundColor: M, borderRadius: 2 * k, transform: [{ rotate: '-6deg' }] })} />;
  return (
    <Animated.View
      style={{
        width: size,
        height: size * (140 / 120),
        transform: [
          { translateY: Animated.add(bob.interpolate({ inputRange: [0, 1], outputRange: [0, -5 * k] }), hop.interpolate({ inputRange: [0, 1], outputRange: [0, -22 * k] })) },
          { scale: hop.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] }) },
        ],
      }}
    >
      {/* stín */}
      <View style={box(26, 129, 68, 9, { backgroundColor: 'rgba(17,17,17,0.10)', borderRadius: 34 * k })} />
      {/* ocásek s hřebínkem */}
      {[[89, 96], [96, 92.6], [103, 89]].map(([x, y], i) => (
        <View key={'s' + i} style={box(x, y, 7, 7, { backgroundColor: GD, borderRadius: 2 * k, transform: [{ rotate: '17deg' }] })} />
      ))}
      <View style={box(78, 98, 40, 16, { backgroundColor: GD, borderRadius: 8 * k, transform: [{ rotate: '-28deg' }] })} />
      {/* nožky */}
      <View style={box(34, 116, 22, 14, { backgroundColor: GD, borderRadius: 7 * k })} />
      <View style={box(64, 116, 22, 14, { backgroundColor: GD, borderRadius: 7 * k })} />
      {/* levá ručka */}
      <View style={box(17, 82, 14, 26, { backgroundColor: G, borderRadius: 7 * k, transform: [{ rotate: '22deg' }] })} />
      {/* tělo a bříško */}
      <View style={box(28, 70, 64, 54, { borderRadius: 26 * k, overflow: 'hidden' })}>
        <LinearGradient colors={['#6FD9A0', '#3FB37A']} start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }} style={{ flex: 1 }} />
      </View>
      <View style={box(40, 80, 40, 40, { backgroundColor: CREAM, borderRadius: 20 * k })} />
      <View style={box(46, 92, 28, 2.5, { backgroundColor: 'rgba(180,140,40,0.25)', borderRadius: 2 * k })} />
      <View style={box(46, 103, 28, 2.5, { backgroundColor: 'rgba(180,140,40,0.25)', borderRadius: 2 * k })} />
      {/* oči na hlavě */}
      <View style={box(24, 4, 32, 30, { backgroundColor: '#6AD69C', borderRadius: 16 * k })} />
      <View style={box(64, 4, 32, 30, { backgroundColor: '#6AD69C', borderRadius: 16 * k })} />
      {/* hlava */}
      <View style={box(14, 18, 92, 64, { borderRadius: 32 * k, overflow: 'hidden' })}>
        <LinearGradient colors={['#74DCA4', '#4CBF84']} start={{ x: 0.3, y: 0 }} end={{ x: 0.6, y: 1 }} style={{ flex: 1 }} />
      </View>
      {[[52, 22], [62, 22], [57, 28]].map(([x, y], i) => (
        <View key={'p' + i} style={box(x, y, 6, 4, { backgroundColor: 'rgba(30,110,70,0.25)', borderRadius: 3 * k })} />
      ))}
      <View style={box(30, 9, 20, 20, { backgroundColor: '#FFFFFF', borderRadius: 10 * k })} />
      <View style={box(70, 9, 20, 20, { backgroundColor: '#FFFFFF', borderRadius: 10 * k })} />
      {eye(40, blink)}
      {eye(80, blink || mood === 'wink')}
      {/* čumák */}
      <View style={box(18, 44, 84, 38, { backgroundColor: SNOUT, borderRadius: 19 * k })} />
      <View style={box(46, 50, 6, 4, { backgroundColor: M, borderRadius: 3 * k, opacity: 0.7 })} />
      <View style={box(68, 50, 6, 4, { backgroundColor: M, borderRadius: 3 * k, opacity: 0.7 })} />
      <View style={box(16, 56, 13, 8, { backgroundColor: 'rgba(255,143,177,0.75)', borderRadius: 6 * k })} />
      <View style={box(91, 56, 13, 8, { backgroundColor: 'rgba(255,143,177,0.75)', borderRadius: 6 * k })} />
      {mouth}
      {/* pravá ručka (mává) */}
      <Animated.View
        style={{
          position: 'absolute',
          left: 89 * k,
          top: 80 * k,
          width: 14 * k,
          height: 26 * k,
          transformOrigin: 'top',
          transform: [{ rotate: wave ? arm.interpolate({ inputRange: [-1, 1], outputRange: ['-150deg', '-115deg'] }) : '-22deg' }],
        }}
      >
        <View style={{ flex: 1, borderRadius: 7 * k, backgroundColor: G }} />
      </Animated.View>
    </Animated.View>
  );
}

function SpeechBubble({ text, style, small }) {
  return (
    <View style={[st.bubble, style]}>
      <View style={st.bubbleTail} />
      <Text style={[st.bubbleTxt, small && { fontSize: 14 }]}>{text}</Text>
    </View>
  );
}

function Blobs() {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(a, { toValue: 1, duration: 6000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(a, { toValue: 0, duration: 6000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();
  }, []);
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Animated.View
        style={[st.blob, { top: -80, right: -90, transform: [{ translateX: a.interpolate({ inputRange: [0, 1], outputRange: [0, -30] }) }, { translateY: a.interpolate({ inputRange: [0, 1], outputRange: [0, 24] }) }] }]}
      />
      <Animated.View
        style={[st.blob, { bottom: -120, left: -110, backgroundColor: '#F6F0FF', transform: [{ translateX: a.interpolate({ inputRange: [0, 1], outputRange: [0, 34] }) }, { translateY: a.interpolate({ inputRange: [0, 1], outputRange: [0, -20] }) }] }]}
      />
    </View>
  );
}

// ---------- Flow (progress + kroky) ----------
function Flow({ steps, onExit, onFinish, ctx }) {
  const [i, setI] = useState(0);
  const prog = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(prog, {
      toValue: (i + 1) / (steps.length + 1),
      duration: 400,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [i]);
  const next = () => {
    if (!steps[i].noPoints && !steps[i].hideHeader) ctx.addPoints(10);
    impact('Soft');
    i < steps.length - 1 ? setI(i + 1) : onFinish();
  };
  const back = () => (i > 0 ? setI(i - 1) : onExit());
  const Step = steps[i];
  return (
    <SafeAreaView style={st.safe} edges={['top', 'bottom']}>
      <Blobs />
      {!Step.hideHeader && (
        <View style={st.header}>
          <Pressable onPress={back} hitSlop={14} style={st.backBtn}>
            <Text style={st.backTxt}>‹</Text>
          </Pressable>
          <View style={st.track}>
            <Animated.View
              style={[st.fill, { width: prog.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]}
            />
          </View>
          <PointsPill points={ctx.points} />
        </View>
      )}
      {!Step.hideHeader && Step.tip ? (
        <View style={st.guideRow}>
          <Taki size={58} mood={Step.mood || 'happy'} jump={i + 1} />
          <FadeIn key={'tip' + i} style={{ flex: 1, marginLeft: 6 }}>
            <SpeechBubble text={Step.tip} small />
          </FadeIn>
        </View>
      ) : null}
      <View key={i} style={{ flex: 1 }}>
        <Step next={next} ctx={ctx} />
      </View>
    </SafeAreaView>
  );
}


// ---------- Welcome ----------
function FloatCard({ item, style, rot, delay }) {
  const inA = useRef(new Animated.Value(0)).current;
  const fl = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(inA, { toValue: 1, friction: 6, delay, useNativeDriver: true }).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(fl, { toValue: 1, duration: 1800 + delay, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(fl, { toValue: 0, duration: 1800 + delay, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();
  }, []);
  return (
    <Animated.View
      style={[
        st.floatCard,
        style,
        {
          opacity: inA,
          transform: [
            { scale: inA },
            { translateY: fl.interpolate({ inputRange: [0, 1], outputRange: [0, -10] }) },
            { rotate: `${rot}deg` },
          ],
        },
      ]}
    >
      <Thumb item={item} emojiSize={40} style={{ height: 86, borderRadius: 14 }}>
        <View style={[st.freeBadge, { top: 6, left: 6, paddingHorizontal: 6, paddingVertical: 2 }]}>
          <Text style={[st.freeBadgeTxt, { fontSize: 9 }]}>ZDARMA</Text>
        </View>
      </Thumb>
      <Text style={{ fontWeight: '700', fontSize: 12, marginTop: 6, color: INK }} numberOfLines={1}>{item.t}</Text>
      <Text style={{ fontSize: 10, color: SUB }}>{item.km} km • před {item.m} min</Text>
    </Animated.View>
  );
}

function Twinkle({ e, style, delay }) {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(a, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(a, { toValue: 0, duration: 700, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  return (
    <Animated.Text style={[{ position: 'absolute', fontSize: 20, opacity: a, transform: [{ scale: a.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1.2] }) }] }, style]}>
      {e}
    </Animated.Text>
  );
}

function Welcome({ onStart }) {
  const picks = [0, 4, 2, 8, 1, 10].map((k) => ITEMS[k]);
  const pos = [
    { left: 10, top: 20, rot: -8 },
    { left: W / 2 - 66, top: 0, rot: 4 },
    { right: 10, top: 30, rot: 9 },
    { left: 24, top: 190, rot: 6 },
    { left: W / 2 - 60, top: 170, rot: -5 },
    { right: 20, top: 200, rot: -10 },
  ];
  return (
    <SafeAreaView style={st.safe} edges={['top', 'bottom']}>
      <Blobs />
      <View style={{ height: 330 }}>
        {picks.map((it, i) => {
          const { rot, ...p } = pos[i];
          return <FloatCard key={it.t} item={it} rot={rot} delay={i * 120} style={p} />;
        })}
        <Twinkle e="✨" style={{ left: 30, top: 160 }} delay={0} />
        <Twinkle e="💜" style={{ right: 40, top: 165 }} delay={400} />
        <Twinkle e="⭐" style={{ left: W / 2 - 10, top: 150 }} delay={800} />
        <Twinkle e="🎁" style={{ right: 24, top: 6 }} delay={1200} />
      </View>
      <View style={{ flex: 1, paddingHorizontal: 24, justifyContent: 'flex-end' }}>
        <FadeIn delay={400} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
          <Taki size={92} wave mood="excited" />
          <SpeechBubble text="Ahoj, já jsem Taki! 👋 Provedu tě appkou." style={{ flex: 1, marginLeft: 6 }} />
        </FadeIn>
        <FadeIn delay={600} style={{ alignItems: 'center' }}>
          <Logo size={40} />
          <Text style={[st.h1, { textAlign: 'center', marginTop: 14, fontSize: 30 }]}>Věci zdarma od sousedů</Text>
          <Text style={[st.sub, { textAlign: 'center' }]}>Najdi, co potřebuješ, a pošli dál, co už nepotřebuješ. Za minutu je hotovo – a na konci tě čeká dárek 🎁</Text>
        </FadeIn>
        <FadeIn delay={800} style={{ marginTop: 24 }}>
          <Button title="Začít" onPress={onStart} />
        </FadeIn>
      </View>
    </SafeAreaView>
  );
}

// ---------- Intro ----------
function Intro({ onPick }) {
  const [sel, setSel] = useState(null);
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 1400, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])
    ).start();
  }, []);
  return (
    <SafeAreaView style={st.safe} edges={['top', 'bottom']}>
      <Blobs />
      <View style={{ flex: 1, paddingHorizontal: 24 }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <FadeIn style={{ marginBottom: 6 }}>
            <SpeechBubble text={sel === 'give' ? 'Super, budeš dárce! 💜' : sel === 'take' ? 'Jdeme hledat poklady! 🔎' : 'Na co se chystáš?'} />
          </FadeIn>
          <Taki size={150} wave={!sel} mood={sel ? 'excited' : 'happy'} jump={sel ? (sel === 'give' ? 1 : 2) : 0} />
          <FadeIn delay={150} style={{ alignItems: 'center', marginTop: 24 }}>
            <Text style={[st.h1, { textAlign: 'center' }]}>Co tě přivádí do TAKE.it?</Text>
            <Text style={[st.sub, { textAlign: 'center' }]}>Vyber jednu možnost – appku ti nastavíme na míru.</Text>
          </FadeIn>
        </View>
        <View style={{ marginBottom: 24 }}>
          <Option emoji="🎁" label="Chci darovat věci" selected={sel === 'give'} onPress={() => setSel('give')} delay={300} />
          <Option emoji="🛍️" label="Chci věci zdarma" selected={sel === 'take'} onPress={() => setSel('take')} delay={400} />
        </View>
        <Button title="Pokračovat" disabled={!sel} onPress={() => onPick(sel)} />
      </View>
    </SafeAreaView>
  );
}


// ---------- DAROVAT ----------
function GiveReason({ next, ctx }) {
  const [sel, setSel] = useState(ctx.data.reason || null);
  const opts = ['Rychle uklidit doma', 'Ušetřit za odvoz a skládku', 'Méně odpadu', 'Pomoct sousedům'];
  return (
    <StepLayout
      title="Proč dáváš věci pryč?"
      disabled={!sel}
      onNext={() => {
        ctx.set('reason', sel);
        next();
      }}
      center
    >
      {opts.map((o, i) => (
        <Option key={o} label={o} selected={sel === o} onPress={() => setSel(o)} delay={100 + i * 70} />
      ))}
    </StepLayout>
  );
}

function GiveSavings({ next }) {
  const h1 = useRef(new Animated.Value(0)).current;
  const h2 = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.stagger(300, [
      Animated.spring(h1, { toValue: 230, friction: 7, useNativeDriver: false }),
      Animated.spring(h2, { toValue: 34, friction: 6, useNativeDriver: false }),
    ]).start(() => success());
  }, []);
  return (
    <StepLayout
      title="Ušetři za odvoz"
      subtitle="Odvoz objemné věci tě může stát stovky korun. Soused si ji odnese zdarma."
      onNext={next}
    >
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-end', height: 260 }}>
          <View style={{ alignItems: 'center', marginHorizontal: 22 }}>
            <Animated.View style={[st.bar, { height: h1, backgroundColor: '#2A2A2A' }]} />
          </View>
          <View style={{ alignItems: 'center', marginHorizontal: 22 }}>
            <Animated.View style={[st.bar, { height: h2, backgroundColor: B }]} />
          </View>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 14 }}>
          <View style={st.barLabelBox}>
            <Text style={st.barValue}>stovky Kč</Text>
            <Text style={st.barLabel}>Odvoz</Text>
          </View>
          <View style={st.barLabelBox}>
            <Text style={[st.barValue, { color: B }]}>0 Kč</Text>
            <Text style={st.barLabel}>Na TAKE.IT</Text>
          </View>
        </View>
        <FadeIn delay={900}>
          <Text style={[st.sub, { textAlign: 'center', marginTop: 28 }]}>
            Na TAKE.IT si to soused odnese sám – a ty nezaplatíš nic.
          </Text>
        </FadeIn>
      </View>
    </StepLayout>
  );
}

// --- Animace podle důvodu darování ---
function ClearAnim() {
  const items = ['🛋️', '📚', '🧸', '🪑', '💡', '🧥'];
  const anims = useRef(items.map(() => new Animated.Value(0))).current;
  const sparkle = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const stops = [rumble(380 * (anims.length - 1) + 800, { delay: 600 })];
    Animated.sequence([
      Animated.delay(600),
      Animated.stagger(380, anims.map((a) => Animated.timing(a, { toValue: 1, duration: 800, easing: Easing.in(Easing.cubic), useNativeDriver: true }))),
      Animated.spring(sparkle, { toValue: 1, friction: 5, useNativeDriver: true }),
    ]).start(() => success());
    return () => stops.forEach((f) => f());
  }, []);
  return (
    <View style={[st.chartCard, { height: 240, justifyContent: 'center' }]}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-around' }}>
        {items.map((e, i) => (
          <Animated.Text
            key={e}
            style={{
              fontSize: 54,
              width: '33%',
              textAlign: 'center',
              marginVertical: 8,
              opacity: anims[i].interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
              transform: [
                { translateY: anims[i].interpolate({ inputRange: [0, 1], outputRange: [0, -90] }) },
                { scale: anims[i].interpolate({ inputRange: [0, 1], outputRange: [1, 0.5] }) },
                { rotate: anims[i].interpolate({ inputRange: [0, 1], outputRange: ['0deg', i % 2 ? '25deg' : '-25deg'] }) },
              ],
            }}
          >
            {e}
          </Animated.Text>
        ))}
      </View>
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center', opacity: sparkle, transform: [{ scale: sparkle }] }]}
      >
        <Text style={{ fontSize: 84 }}>✨</Text>
        <Text style={[st.bigNum, { fontSize: 40 }]}>Čisto!</Text>
      </Animated.View>
    </View>
  );
}

function WasteAnim() {
  const items = ['🛋️', '🚲', '🧸', '☕'];
  const anims = useRef(items.map(() => new Animated.Value(0))).current;
  const spin = useRef(new Animated.Value(0)).current;
  const colW = (W - 48 - 36) / 2;
  useEffect(() => {
    Animated.loop(Animated.timing(spin, { toValue: 1, duration: 4000, easing: Easing.linear, useNativeDriver: true })).start();
    Animated.sequence([
      Animated.delay(500),
      Animated.stagger(300, anims.map((a) => Animated.spring(a, { toValue: 1, friction: 7, useNativeDriver: false }))),
    ]).start(() => success());
  }, []);
  return (
    <View style={st.chartCard}>
      <Animated.Text
        style={{ fontSize: 44, textAlign: 'center', transform: [{ rotate: spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }] }}
      >
        ♻️
      </Animated.Text>
      <View style={{ flexDirection: 'row', marginTop: 10, marginBottom: 6 }}>
        <Text style={[st.chartL, { width: colW, textAlign: 'center', color: '#FF3B30' }]}>🗑️ Skládka</Text>
        <Text style={[st.chartL, { width: colW, textAlign: 'center', color: GREEN }]}>🏡 Nový domov</Text>
      </View>
      {items.map((e, i) => (
        <Animated.View
          key={e}
          style={{
            width: colW,
            alignItems: 'center',
            marginVertical: 5,
            transform: [{ translateX: anims[i].interpolate({ inputRange: [0, 1], outputRange: [0, colW] }) }],
          }}
        >
          <Animated.View
            style={{
              width: 58,
              height: 58,
              borderRadius: 18,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: anims[i].interpolate({ inputRange: [0, 1], outputRange: ['#FFE1DF', '#DDF7E5'] }),
            }}
          >
            <Text style={{ fontSize: 30 }}>{e}</Text>
          </Animated.View>
        </Animated.View>
      ))}
    </View>
  );
}

function NeighborsAnim() {
  const people = ['👩', '👨‍🦰', '👵', '🧑', '👨‍👧', '👱‍♀️'];
  const pops = useRef(people.map(() => new Animated.Value(0))).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const hearts = useRef([0, 1, 2].map(() => new Animated.Value(0))).current;
  const R = 105;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 700, useNativeDriver: true }),
      ])
    ).start();
    Animated.stagger(180, pops.map((a) => Animated.spring(a, { toValue: 1, friction: 5, useNativeDriver: true }))).start(() => success());
    hearts.forEach((h, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 600),
          Animated.timing(h, { toValue: 1, duration: 1800, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          Animated.timing(h, { toValue: 0, duration: 0, useNativeDriver: true }),
        ])
      ).start()
    );
  }, []);
  return (
    <View style={{ height: 290, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ position: 'absolute', width: R * 2, height: R * 2, borderRadius: R, borderWidth: 2, borderColor: B_LIGHT, borderStyle: 'dashed' }} />
      {people.map((e, i) => {
        const ang = (i / people.length) * Math.PI * 2 - Math.PI / 2;
        return (
          <Animated.View
            key={e}
            style={{
              position: 'absolute',
              width: 56,
              height: 56,
              borderRadius: 28,
              backgroundColor: B_LIGHT,
              alignItems: 'center',
              justifyContent: 'center',
              transform: [{ translateX: Math.cos(ang) * R }, { translateY: Math.sin(ang) * R }, { scale: pops[i] }],
            }}
          >
            <Text style={{ fontSize: 30 }}>{e}</Text>
          </Animated.View>
        );
      })}
      <Animated.View
        style={{
          width: 96,
          height: 96,
          borderRadius: 48,
          backgroundColor: B,
          alignItems: 'center',
          justifyContent: 'center',
          transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] }) }],
        }}
      >
        <Text style={{ fontSize: 44 }}>🎁</Text>
      </Animated.View>
      {hearts.map((h, i) => (
        <Animated.Text
          key={i}
          style={{
            position: 'absolute',
            fontSize: 26,
            opacity: h.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 1, 0] }),
            transform: [
              { translateX: (i - 1) * 30 },
              { translateY: h.interpolate({ inputRange: [0, 1], outputRange: [-40, -140] }) },
            ],
          }}
        >
          💜
        </Animated.Text>
      ))}
    </View>
  );
}

const REASON_SCREENS = {
  'Rychle uklidit doma': {
    title: 'Uklizeno za pár minut',
    sub: 'Vyfotíš, přidáš – a sousedé si věci odnesou sami.',
    foot: 'Žádné tahání, žádné stěhování. Jen víc místa doma.',
    Anim: ClearAnim,
  },
  'Méně odpadu': {
    title: 'Dej věcem druhý život',
    sub: 'Místo na skládce skončí u někoho, komu udělají radost.',
    foot: 'Každá darovaná věc je o jednu méně na skládce.',
    Anim: WasteAnim,
  },
  'Pomoct sousedům': {
    title: 'Udělej radost sousedům',
    sub: 'Tvoje nepotřebná věc může někomu kousek od tebe hodně pomoct.',
    foot: 'Na TAKE.IT darují sousedé sousedům. 💜',
    Anim: NeighborsAnim,
  },
};

function GiveImpact({ next, ctx }) {
  const cfg = REASON_SCREENS[ctx.data.reason];
  if (!cfg) return <GiveSavings next={next} />;
  const { Anim } = cfg;
  return (
    <StepLayout title={cfg.title} subtitle={cfg.sub} onNext={next}>
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <FadeIn delay={150}>
          <Anim />
        </FadeIn>
        <FadeIn delay={1400}>
          <Text style={[st.sub, { textAlign: 'center', marginTop: 24 }]}>{cfg.foot}</Text>
        </FadeIn>
      </View>
    </StepLayout>
  );
}

function GiveWhat({ next, ctx }) {
  const [sel, setSel] = useState(ctx.data.giveCats || []);
  const toggle = (c) => setSel(sel.includes(c) ? sel.filter((x) => x !== c) : [...sel, c]);
  return (
    <StepLayout
      title="Co chceš darovat?"
      subtitle="Vyber klidně víc věcí – podle toho ti pošleme vhodné zájemce."
      disabled={!sel.length}
      onNext={() => {
        ctx.set('giveCats', sel);
        next();
      }}
    >
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {CATEGORIES.map(([e, c], i) => (
          <FadeIn key={c} delay={60 + i * 40}>
            <Pressable
              onPress={() => {
                tap();
                toggle(c);
              }}
              style={[st.catChip, sel.includes(c) && st.catChipSel]}
            >
              <Text style={[st.catTxt, sel.includes(c) && { color: B }]}>{e}  {c}</Text>
            </Pressable>
          </FadeIn>
        ))}
      </View>
    </StepLayout>
  );
}

function GiveAmount({ next, ctx }) {
  const [sel, setSel] = useState(ctx.data.amount || null);
  const opts = [['📦', '1–5 věcí'], ['📦📦', '5–10 věcí'], ['🚚', '10–20 věcí'], ['🏠', 'Stěhuju se – víc než 20']];
  return (
    <StepLayout
      title="Kolik toho chceš poslat dál?"
      disabled={!sel}
      onNext={() => {
        ctx.set('amount', sel);
        next();
      }}
      center
    >
      {opts.map(([e, o], i) => (
        <Option key={o} emoji={e} label={o} selected={sel === o} onPress={() => setSel(o)} delay={100 + i * 70} />
      ))}
    </StepLayout>
  );
}

function GivePickup({ next, ctx }) {
  const [sel, setSel] = useState(ctx.data.pickup || null);
  const opts = ['Kdykoli dnes', 'Jen večer', 'O víkendu', 'Nejdřív mi napište'];
  return (
    <StepLayout
      title="Kdy si to můžou vyzvednout?"
      disabled={!sel}
      onNext={() => {
        ctx.set('pickup', sel);
        next();
      }}
      center
    >
      {opts.map((o, i) => (
        <Option key={o} label={o} selected={sel === o} onPress={() => setSel(o)} delay={100 + i * 70} />
      ))}
    </StepLayout>
  );
}


function PinBubble() {
  return (
    <View style={st.pin}>
      <Text style={st.pinTxt}>TAKE.IT</Text>
    </View>
  );
}

function PopIn({ children, delay = 0 }) {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(a, { toValue: 1, friction: 4, tension: 120, delay, useNativeDriver: true }).start();
  }, []);
  return <Animated.View style={{ transform: [{ scale: a }] }}>{children}</Animated.View>;
}


function GiveSpeed({ next }) {
  const a = useRef(new Animated.Value(0)).current;
  const b = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const stop1 = rumble(1500, { end: 'success' });
    const stop2 = () => {};
    Animated.stagger(550, [
      Animated.timing(a, { toValue: 1, duration: 1400, easing: Easing.out(Easing.cubic), useNativeDriver: false }),
      Animated.timing(b, { toValue: 1, duration: 950, easing: Easing.out(Easing.cubic), useNativeDriver: false }),
    ]).start();
    return () => {
      stop1();
      stop2();
    };
  }, []);
  return (
    <StepLayout
      title="Proč se to vyplatí?"
      subtitle="Žádné tahání na sběrný dvůr. Vyfoť, přidej, hotovo."
      onNext={next}
    >
      <FadeIn delay={150} style={st.chartCard}>
        <Text style={st.chartL}>Sběrný dvůr</Text>
        <View style={st.hTrack}>
          <Animated.View style={[st.hBar, { backgroundColor: '#2A2A2A', width: a.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]} />
        </View>
        <Text style={st.chartAxis}>Naložit → odvézt → vyložit → zpátky domů</Text>
        <Text style={[st.chartL, { color: B, marginTop: 22 }]}>TAKE.IT</Text>
        <View style={st.hTrack}>
          <Animated.View style={[st.hBar, { backgroundColor: B, width: b.interpolate({ inputRange: [0, 1], outputRange: ['0%', '18%'] }) }]} />
        </View>
        <Text style={st.chartAxis}>Vyfoť → přidej → soused si to vyzvedne</Text>
      </FadeIn>
      <FadeIn delay={900} style={{ alignItems: 'center', marginTop: 28 }}>
        <Text style={st.bigNum}>30 s</Text>
        <Text style={st.sub}>na přidání inzerátu, zbytek vyřeší sousedé</Text>
      </FadeIn>
    </StepLayout>
  );
}

const DAYS = ['neděle', 'pondělí', 'úterý', 'středa', 'čtvrtek', 'pátek', 'sobota'];
const MONTHS = ['ledna', 'února', 'března', 'dubna', 'května', 'června', 'července', 'srpna', 'září', 'října', 'listopadu', 'prosince'];

function NotifCard({ msg, depth }) {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(a, { toValue: 1, friction: 6, useNativeDriver: true }).start();
  }, []);
  return (
    <Animated.View
      style={[
        st.notif,
        {
          position: 'absolute',
          width: W - 48,
          marginTop: 0,
          opacity: Animated.multiply(a, 1 - depth * 0.3),
          transform: [
            { translateY: Animated.add(a.interpolate({ inputRange: [0, 1], outputRange: [-40, 0] }), depth * 12) },
            { scale: 1 - depth * 0.05 },
          ],
        },
      ]}
    >
      <AppIcon size={44} />
      <View style={{ flex: 1, marginLeft: 12 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ fontWeight: '700', color: SUB }}>TAKE.IT</Text>
          <Text style={{ color: SUB }}>{depth === 0 ? 'teď' : `před ${depth} min`}</Text>
        </View>
        <Text style={{ fontSize: 15, color: INK, marginTop: 2 }} numberOfLines={2}>{msg}</Text>
      </View>
    </Animated.View>
  );
}

function NotifStack({ msgs }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    const ts = msgs.map((_, i) =>
      setTimeout(() => {
        setN(i + 1);
        success();
      }, 400 + i * 1400)
    );
    return () => ts.forEach(clearTimeout);
  }, []);
  const vis = msgs.slice(0, n).reverse().slice(0, 3);
  return (
    <View style={{ width: W - 48, height: 110, marginTop: -26 }}>
      {vis
        .map((m, depth) => <NotifCard key={m} msg={m} depth={depth} />)
        .reverse()}
    </View>
  );
}

function NotifyStep({ next, ctx, msgs }) {
  const [v, setV] = useState(ctx.data.notify ?? 3);
  const now = new Date();
  const date = `${DAYS[now.getDay()]} ${now.getDate()}. ${MONTHS[now.getMonth()]}`;
  const time = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;
  const drop = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(drop, { toValue: 1, friction: 6, delay: 400, useNativeDriver: true }).start(() => success());
  }, []);
  return (
    <StepLayout
      cta="Pokračovat"
      onNext={async () => {
        ctx.set('notify', v);
        if (v > 0) {
          try {
            await Notifications.requestPermissionsAsync();
          } catch (e) {}
        }
        next();
      }}
    >
      <View style={{ alignItems: 'center' }}>
        <View style={st.phone}>
          <View style={st.island} />
          <Text style={st.lockDate}>{date}</Text>
          <Text style={st.lockTime}>{time}</Text>
        </View>
        <NotifStack msgs={msgs} />
      </View>
      <View style={{ alignItems: 'center', marginTop: 12 }}>
        <Text style={[st.bigNum, { fontSize: 64 }]}>{v === 0 ? '0' : v}</Text>
        <Text style={st.sub}>{v === 0 ? 'bez upozornění' : '× denně'}</Text>
      </View>
      <View style={{ paddingHorizontal: 8, marginTop: 8 }}>
        <Slider value={v} min={0} max={10} onChange={setV} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={st.chartAxis}>Nikdy</Text>
          <Text style={st.chartAxis}>10× denně</Text>
        </View>
      </View>
      <Text style={[st.h2, { textAlign: 'center', marginTop: 18 }]}>Jak často tě máme upozornit?</Text>
    </StepLayout>
  );
}

const NotifyGive = (p) => (
  <NotifyStep
    {...p}
    msgs={['Jana si chce vyzvednout tvoje knihy 📚', 'Petr chce tvoji lampu. Domluvte se 👋', 'Tvoje pohovka má 3 zájemce! 🔥']}
  />
);
const NotifyTake = (p) => (
  <NotifyStep
    {...p}
    msgs={['Nová věc v okolí: dětské kolo 🚲', 'Kávovar zdarma 600 m od tebe ☕', 'Retro gramofon se právě objevil kousek od tebe!']}
  />
);

function Setup({ next, title, items, emoji }) {
  const [p, setP] = useState(0);
  const bounce = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const a = new Animated.Value(0);
    const id = a.addListener(({ value }) => setP(Math.round(value)));
    const stop = rumble(5100, { peak: 'Rigid' });
    Animated.timing(a, { toValue: 100, duration: 5200, easing: Easing.inOut(Easing.quad), useNativeDriver: false }).start(() => {
      success();
      setTimeout(next, 800);
    });
    Animated.loop(
      Animated.sequence([
        Animated.timing(bounce, { toValue: 1, duration: 600, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(bounce, { toValue: 0, duration: 600, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])
    ).start();
    return () => {
      a.removeListener(id);
      stop();
    };
  }, []);
  const per = 100 / items.length;
  const doneCount = Math.floor(p / per);
  useEffect(() => {
    // (vibrace běží souvisle přes rumble)
  }, [doneCount]);
  return (
    <View style={{ flex: 1, paddingHorizontal: 24, justifyContent: 'center' }}>
      <View style={{ alignItems: 'center' }}>
        <Taki size={130} mood={p >= 100 ? 'excited' : 'think'} jump={p >= 100 ? 1 : 0} />
      </View>
      <Text style={[st.bigNum, { fontSize: 76, color: INK, textAlign: 'center', marginTop: 12 }]}>{p}%</Text>
      <Text style={[st.h1, { textAlign: 'center', fontSize: 28 }]}>{title}</Text>
      <View style={[st.track, { marginTop: 22, height: 10, flex: 0 }]}>
        <View style={[st.fill, { width: `${p}%` }]} />
      </View>
      <View style={[st.chartCard, { marginTop: 26 }]}>
        {items.map((t, i) => {
          const done = i < doneCount || p === 100;
          const active = i === doneCount && p < 100;
          return (
            <View key={t} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 9 }}>
              <View style={[st.check, done && { backgroundColor: B }, active && { backgroundColor: 'transparent' }]}>
                {done ? <Text style={{ color: '#fff', fontWeight: '900' }}>✓</Text> : null}
                {active ? <ActivityIndicator color={B} /> : null}
              </View>
              <Text style={{ fontSize: 17, marginLeft: 14, color: done || active ? INK : '#B5B5BA' }}>{t}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const SetupGive = (p) => (
  <Setup
    {...p}
    emoji="📦"
    title="Připravujeme tvůj dárcovský profil"
    items={['Vytváříme tvůj profil', 'Ukládáme preference vyzvednutí', 'Hledáme sousedy v okolí', 'Připravujeme první inzerát']}
  />
);
SetupGive.hideHeader = true;


function Gallery({ item, height }) {
  const [page, setPage] = useState(0);
  const slides = item.photos && item.photos.length
    ? item.photos.map((u) => ({ uri: u }))
    : item.img
    ? [{ uri: item.img }, { uri: item.img2 || item.img }]
    : [
        { e: item.e, size: 130, rot: '0deg' },
        { e: item.e, size: 190, rot: '-12deg' },
        { e: item.e, size: 90, rot: '8deg' },
      ];
  return (
    <View style={{ height }}>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / W))}
      >
        {slides.map((sl, k) => (
          sl.uri ? (
            <Thumb key={k} item={item} src={sl.uri} emojiSize={130} style={{ width: W, height }} />
          ) : (
            <LinearGradient key={k} colors={k % 2 ? [item.g[1], item.g[0]] : item.g} style={{ width: W, height, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: sl.size, transform: [{ rotate: sl.rot }] }}>{sl.e}</Text>
            </LinearGradient>
          )
        ))}
      </ScrollView>
      {slides.length > 1 ? (
        <View style={st.dots}>
          {slides.map((_, k) => (
            <View key={k} style={[st.dot, page === k && st.dotOn]} />
          ))}
        </View>
      ) : null}
      <View style={st.photoCount}>
        <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>
          {page + 1}/{slides.length}
        </Text>
      </View>
    </View>
  );
}


function timeAgo(d) {
  const m = Math.floor((Date.now() - d) / 60000);
  return m < 1 ? 'právě teď' : `před ${m} min`;
}

function Toast({ toast, onPress, onHide }) {
  const insets = useSafeAreaInsets();
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!toast) return;
    a.setValue(0);
    Animated.spring(a, { toValue: 1, friction: 7, useNativeDriver: true }).start();
    const t = setTimeout(() => Animated.timing(a, { toValue: 0, duration: 250, useNativeDriver: true }).start(onHide), 4000);
    return () => clearTimeout(t);
  }, [toast]);
  if (!toast) return null;
  return (
    <Animated.View
      style={[
        st.toast,
        { top: insets.top + 6, opacity: a, transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [-120, 0] }) }] },
      ]}
    >
      <Pressable onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center' }}>
        <AppIcon size={40} />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={{ fontWeight: '800', color: INK, fontSize: 15 }}>{toast.title}</Text>
          <Text style={{ color: SUB, fontSize: 14, marginTop: 2 }} numberOfLines={2}>{toast.body}</Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}


function GiftStep({ next, ctx }) {
  const [taps, setTaps] = useState(0);
  const [open, setOpen] = useState(false);
  const shake = useRef(new Animated.Value(0)).current;
  const grow = useRef(new Animated.Value(1)).current;
  const hint = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(hint, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(hint, { toValue: 0, duration: 600, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  const onTap = () => {
    if (open) return;
    const t = taps + 1;
    setTaps(t);
    try {
      Haptics.impactAsync(t < 3 ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
    } catch (e) {}
    shake.setValue(0);
    Animated.sequence([
      Animated.timing(shake, { toValue: 1, duration: 85, useNativeDriver: true }),
      Animated.timing(shake, { toValue: -1, duration: 85, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 1, duration: 85, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 0, duration: 85, useNativeDriver: true }),
    ]).start();
    Animated.spring(grow, { toValue: 1 + t * 0.12, friction: 4, useNativeDriver: true }).start();
    if (t >= 3) rumble(650, { peak: 'Heavy' });
    if (t >= 3) {
      setTimeout(() => {
        setOpen(true);
        success();
        ctx.set('welcomeGift', true);
        ctx.addPoints(100);
      }, 700);
    }
  };
  const rewards = [
    ['🌱', 'Odznak Nováček', 'Za to, že jsi s námi od začátku'],
    ['⭐', '+100 bodů dobra', 'Připíšeme ti je po prvním přihlášení'],
    ['🎁', 'Darování navždy zdarma', 'Na TAKE.it nikdy neplatíš za to, že pomáháš'],
  ];
  return (
    <StepLayout
      title={open ? 'Tvůj dárek za stažení 🎉' : 'Máme pro tebe dárek'}
      subtitle={open ? 'Díky, že jsi tady. Tohle všechno je tvoje:' : 'Díky, že sis TAKE.it stáhl. Ťukni 3× na dárek a otevři ho.'}
      cta={open ? 'Super, pokračovat' : null}
      onNext={next}
    >
      {!open ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Pressable onPress={onTap}>
            <Animated.Text
              style={{
                fontSize: 150,
                transform: [
                  { scale: grow },
                  { rotate: shake.interpolate({ inputRange: [-1, 1], outputRange: ['-12deg', '12deg'] }) },
                ],
              }}
            >
              🎁
            </Animated.Text>
          </Pressable>
          <Animated.Text style={[st.h2, { marginTop: 30, color: B, opacity: hint.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }) }]}>
            {taps === 0 ? 'Ťukni na dárek 👆' : `Ještě ${3 - taps}×…`}
          </Animated.Text>
        </View>
      ) : (
        <View style={{ flex: 1, justifyContent: 'center' }}>
          {rewards.map(([e, t, d], i) => (
            <FadeIn key={t} delay={300 + i * 250} style={st.rewardRow}>
              <View style={st.rewardIcon}>
                <Text style={{ fontSize: 28 }}>{e}</Text>
              </View>
              <View style={{ flex: 1, marginLeft: 14 }}>
                <Text style={st.h2}>{t}</Text>
                <Text style={st.chartAxis}>{d}</Text>
              </View>
            </FadeIn>
          ))}
        </View>
      )}
      <Confetti run={open} />
    </StepLayout>
  );
}
GiftStep.noPoints = true;


// ---------- CHCI ZDARMA ----------
function AboutEditor({ reasons, setReasons, about, setAbout, emoji }) {
  const toggle = (l) => {
    impact('Light');
    setReasons(reasons.includes(l) ? reasons.filter((x) => x !== l) : [...reasons, l]);
  };
  return (
    <View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {TAKE_REASONS.map(([ic, l, e], i) => {
          const on = reasons.includes(l);
          return (
            <FadeIn key={l} delay={emoji ? i * 70 : 0}>
              <Pressable onPress={() => toggle(l)} style={[st.reasonChip, on && st.reasonChipOn]}>
                {emoji ? <Text style={{ fontSize: 16 }}>{e}</Text> : <Ionicons name={ic} size={16} color={on ? B : INK} />}
                <Text style={[st.reasonTxt, on && { color: B }]}>{l}</Text>
              </Pressable>
            </FadeIn>
          );
        })}
      </View>
      <Text style={[st.label, { marginTop: 18 }]}>Pár slov o sobě <Text style={{ color: SUB, fontWeight: '500' }}>(nepovinné)</Text></Text>
      <TextInput
        value={about}
        onChangeText={(t) => setAbout(t.slice(0, 300))}
        placeholder="Např. Jsem Petra, se dvěma dětmi se stěhujeme do Brna a zařizujeme byt od nuly."
        placeholderTextColor="#A9A9AE"
        multiline
        style={st.aboutInput}
      />
      <Text style={[st.chartAxis, { textAlign: 'right' }]}>{about.length}/300</Text>
    </View>
  );
}

function ReasonChips({ reasons, max = 6 }) {
  if (!reasons || !reasons.length) return null;
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 }}>
      {reasons.slice(0, max).map((l) => (
        <View key={l} style={st.reasonTag}>
          <Ionicons name={reasonIcon(l)} size={13} color={B} />
          <Text style={st.reasonTagTxt}>{l}</Text>
        </View>
      ))}
    </View>
  );
}

function TakeWhy({ next, ctx }) {
  const [reasons, setReasons] = useState(ctx.data.takeReasons || []);
  const [about, setAbout] = useState(ctx.data.about || '');
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
      <StepLayout
        title="Proč hledáš věci zdarma?"
        subtitle="Dárci to uvidí u tvé žádosti. Lidé radši dávají, když vědí komu."
        disabled={!reasons.length}
        onNext={() => {
          ctx.set('takeReasons', reasons);
          ctx.set('about', about.trim());
          success();
          next();
        }}
      >
        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <AboutEditor reasons={reasons} setReasons={setReasons} about={about} setAbout={setAbout} emoji />
        </ScrollView>
      </StepLayout>
    </KeyboardAvoidingView>
  );
}

function TakeCategories({ next, ctx }) {
  const [sel, setSel] = useState(ctx.data.cats || []);
  const toggle = (c) => setSel(sel.includes(c) ? sel.filter((x) => x !== c) : [...sel, c]);
  return (
    <StepLayout
      title="Co by se ti hodilo?"
      subtitle="Vyber, co tě zajímá – budeme tě upozorňovat jen na to."
      disabled={!sel.length}
      onNext={() => {
        ctx.set('cats', sel);
        next();
      }}
    >
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {CATEGORIES.map(([e, c], i) => (
          <FadeIn key={c} delay={80 + i * 40}>
            <Pressable
              onPress={() => {
                tap();
                toggle(c);
              }}
              style={[st.catChip, sel.includes(c) && st.catChipSel]}
            >
              <Text style={[st.catTxt, sel.includes(c) && { color: B }]}>{e}  {c}</Text>
            </Pressable>
          </FadeIn>
        ))}
      </View>
    </StepLayout>
  );
}

function TakeSavings({ next }) {
  const rows = [['🛋️', 'Gauč', 3000], ['🍼', 'Kočárek', 2500], ['🖥️', 'Monitor', 1500], ['🚲', 'Kolo', 2500]];
  const sum = rows.reduce((s, r) => s + r[2], 0);
  const [total, setTotal] = useState(0);
  useEffect(() => {
    const a = new Animated.Value(0);
    const id = a.addListener(({ value }) => setTotal(Math.round(value / 10) * 10));
    const stops = [];
    stops.push(rumble(2200, { delay: rows.length * 420 + 400, end: 'success' }));
    Animated.timing(a, { toValue: sum, duration: 2200, delay: rows.length * 420 + 400, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
    return () => {
      a.removeListener(id);
      stops.forEach((f) => f());
    };
  }, []);
  return (
    <StepLayout title="Kolik můžeš ušetřit?" subtitle="Příklad: kolik by tyhle věci stály z druhé ruky." onNext={next}>
      <View style={st.chartCard}>
        {rows.map(([e, n, p], i) => (
          <FadeIn key={n} delay={200 + i * 420} style={st.saveRow}>
            <Text style={{ fontSize: 28 }}>{e}</Text>
            <Text style={[st.h2, { flex: 1, marginLeft: 12 }]}>{n}</Text>
            <Text style={st.strike}>{kc(p)} Kč</Text>
            <Text style={st.zero}>0 Kč</Text>
          </FadeIn>
        ))}
      </View>
      <View style={{ alignItems: 'center', marginTop: 30 }}>
        <Text style={st.sub}>Ušetříš</Text>
        <Text style={st.bigNum}>{kc(total)} Kč</Text>
      </View>
    </StepLayout>
  );
}

function TakeCompare({ next }) {
  const a = useRef(new Animated.Value(0)).current;
  const b = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const stop1 = rumble(1500, { end: 'success' });
    const stop2 = () => {};
    Animated.stagger(550, [
      Animated.timing(a, { toValue: 1, duration: 1400, easing: Easing.out(Easing.cubic), useNativeDriver: false }),
      Animated.timing(b, { toValue: 1, duration: 950, easing: Easing.out(Easing.cubic), useNativeDriver: false }),
    ]).start();
    return () => {
      stop1();
      stop2();
    };
  }, []);
  return (
    <StepLayout title="Bez smlouvání a posílání" subtitle="Žádné „je to ještě aktuální?“ ani čekání na Zásilkovnu." onNext={next}>
      <View style={st.chartCard}>
        <Text style={st.chartL}>Bazar</Text>
        <View style={st.hTrack}>
          <Animated.View style={[st.hBar, { backgroundColor: '#2A2A2A', width: a.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]} />
        </View>
        <Text style={st.chartAxis}>Fotky → smlouvání → platba → balení → čekání</Text>
        <Text style={[st.chartL, { color: B, marginTop: 22 }]}>TAKE.IT</Text>
        <View style={st.hTrack}>
          <Animated.View style={[st.hBar, { backgroundColor: B, width: b.interpolate({ inputRange: [0, 1], outputRange: ['0%', '26%'] }) }]} />
        </View>
        <Text style={st.chartAxis}>Napiš → vyzvedni si to</Text>
      </View>
      <FadeIn delay={900} style={{ alignItems: 'center', marginTop: 30 }}>
        <Text style={st.bigNum}>2 kroky</Text>
        <Text style={st.sub}>a věc je tvoje. Zadarmo.</Text>
      </FadeIn>
    </StepLayout>
  );
}

function TakeDistance({ next, ctx }) {
  const [km, setKm] = useState(ctx.data.km || 5);
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(Animated.timing(pulse, { toValue: 1, duration: 1800, easing: Easing.out(Easing.quad), useNativeDriver: true })).start();
  }, []);
  const r = 70 + km * 6;
  return (
    <StepLayout
      title="Jak daleko pro věc dojdeš?"
      onNext={() => {
        ctx.set('km', km);
        next();
      }}
    >
      <View style={{ height: 260, alignItems: 'center', justifyContent: 'center' }}>
        <Animated.View
          style={{
            position: 'absolute',
            width: r * 2,
            height: r * 2,
            borderRadius: r,
            backgroundColor: B,
            opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0] }),
            transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1.1] }) }],
          }}
        />
        <View style={{ position: 'absolute', width: r * 2, height: r * 2, borderRadius: r, backgroundColor: B_LIGHT, borderWidth: 2, borderColor: B }} />
        <Text style={{ fontSize: 44 }}>📍</Text>
      </View>
      <View style={{ alignItems: 'center' }}>
        <Text style={st.bigNum}>{km} km</Text>
        <Text style={st.sub}>kolem tebe</Text>
      </View>
      <View style={{ paddingHorizontal: 8, marginTop: 10 }}>
        <Slider value={km} min={1} max={20} onChange={setKm} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={st.chartAxis}>1 km</Text>
          <Text style={st.chartAxis}>20 km</Text>
        </View>
      </View>
    </StepLayout>
  );
}

const SetupTake = (p) => (
  <Setup
    {...p}
    emoji="🔎"
    title="Hledáme věci ve tvém okolí"
    items={['Nastavujeme tvoje kategorie', 'Prohledáváme okolí', 'Kontrolujeme nové inzeráty', 'Připravujeme tvůj feed']}
  />
);
SetupTake.hideHeader = true;


// ---------- Hlavní appka (záložky) ----------
function Header({ title, right }) {
  return (
    <View style={st.feedHeader}>
      {title ? <Text style={[st.h1, { fontSize: 32 }]}>{title}</Text> : <Logo size={24} />}
      {right}
    </View>
  );
}

function MapPin({ item, active }) {
  return (
    <View style={{ alignItems: 'center' }}>
      <View style={[st.mapPin, active && { borderColor: B, transform: [{ scale: 1.15 }] }, item.badge && { borderColor: item.badgeColor || B }]}>
        <Thumb item={item} emojiSize={22} style={{ width: 40, height: 40, borderRadius: 20 }} />
      </View>
      <View style={[st.mapPinTip, active && { borderTopColor: B }]} />
    </View>
  );
}

function ItemsMap({ items, selected, onSelect, onOpen, center = CENTER }) {
  const card = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(card, { toValue: selected ? 1 : 0, friction: 8, useNativeDriver: true }).start();
  }, [selected]);
  return (
    <View style={{ flex: 1 }}>
      {MapView ? (
        <MapView
          style={StyleSheet.absoluteFill}
          initialRegion={{ ...center, latitudeDelta: 0.06, longitudeDelta: 0.06 }}
          onPress={() => onSelect(null)}
        >
          <Marker coordinate={center}>
            <View style={st.meDot} />
          </Marker>
          {items.map((it) => (
            <Marker
              key={it.id || it.t}
              coordinate={{ latitude: it.lat, longitude: it.lng }}
              onPress={(e) => {
                e.stopPropagation && e.stopPropagation();
                onSelect(it);
              }}
            >
              <MapPin item={it} active={selected && (selected.id || selected.t) === (it.id || it.t)} />
            </Marker>
          ))}
        </MapView>
      ) : (
        <LinearGradient colors={['#EEF6E8', '#DCEFD3']} style={StyleSheet.absoluteFill}>
          {items.map((it, i) => (
            <Pressable
              key={it.id || it.t}
              onPress={() => onSelect(it)}
              style={{ position: 'absolute', left: 20 + ((i * 89) % (W - 80)), top: 30 + ((i * 61) % 380) }}
            >
              <MapPin item={it} active={selected && (selected.id || selected.t) === (it.id || it.t)} />
            </Pressable>
          ))}
        </LinearGradient>
      )}
      {selected ? (
        <Animated.View
          style={[
            st.mapCard,
            {
              opacity: card,
              transform: [{ translateY: card.interpolate({ inputRange: [0, 1], outputRange: [120, 0] }) }],
            },
          ]}
        >
          <Pressable onPress={() => onOpen(selected)} style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Thumb item={selected} emojiSize={32} style={{ width: 72, height: 72, borderRadius: 16 }} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={st.itemTitle}>{selected.t}</Text>
              <Text style={{ color: selected.badgeColor || GREEN, fontWeight: '800', marginTop: 2 }}>{selected.badge || 'Zdarma'}</Text>
              <Text style={st.itemMeta}>{selected.own ? 'Tvoje věc' : selected.meta}</Text>
            </View>
            <Text style={{ fontSize: 26, color: B, fontWeight: '700' }}>›</Text>
          </Pressable>
        </Animated.View>
      ) : (
        <View style={st.mapHint} pointerEvents="none">
          <View style={{ flexDirection: 'row', alignItems: 'center' }}><Ionicons name="location-outline" size={16} color={B} /><Text style={{ fontWeight: '700', color: INK, marginLeft: 6 }}>{items.length} věcí v okolí</Text></View>
        </View>
      )}
    </View>
  );
}

function FiltersSheet({ visible, value, onClose, onApply, count }) {
  const [d, setD] = useState(value);
  useEffect(() => {
    if (visible) setD(value);
  }, [visible]);
  const toggle = (c) => setD({ ...d, cats: d.cats.includes(c) ? d.cats.filter((x) => x !== c) : [...d.cats, c] });
  const n = count(d);
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: '#fff' }}>
        <View style={st.inboxHeader}>
          <Pressable onPress={() => setD({ cats: [], km: 20, sort: 'new' })} hitSlop={10}>
            <Text style={{ color: SUB, fontWeight: '700', fontSize: 16 }}>Resetovat</Text>
          </Pressable>
          <Text style={st.h2}>Filtry</Text>
          <Pressable onPress={onClose} hitSlop={10}>
            <Text style={{ color: B, fontWeight: '700', fontSize: 16 }}>Zavřít</Text>
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={{ padding: 24 }}>
          <Text style={st.label}>Vzdálenost</Text>
          <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
            <Text style={[st.bigNum, { fontSize: 28 }]}>do {d.km} km</Text>
          </View>
          <Slider value={d.km} min={1} max={20} onChange={(v) => setD((x) => ({ ...x, km: v }))} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={st.chartAxis}>1 km</Text>
            <Text style={st.chartAxis}>20 km</Text>
          </View>

          <Text style={[st.label, { marginTop: 24 }]}>Řadit podle</Text>
          <View style={st.segment}>
            {[
              ['new', 'Nejnovější'],
              ['near', 'Nejblíž'],
            ].map(([k, l]) => (
              <Pressable
                key={k}
                onPress={() => {
                  tap();
                  setD({ ...d, sort: k });
                }}
                style={[st.segBtn, d.sort === k && st.segBtnOn]}
              >
                <Text style={[st.segTxt, d.sort === k && { color: INK }]}>{l}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={[st.label, { marginTop: 10 }]}>Kategorie</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {CATEGORIES.map(([e, c]) => (
              <Pressable
                key={c}
                onPress={() => {
                  tap();
                  toggle(c);
                }}
                style={[st.catChip, { flexDirection: 'row', alignItems: 'center', paddingVertical: 11 }, d.cats.includes(c) && st.catChipSel]}
              >
                <Ionicons name={CAT_ICON[c]} size={17} color={d.cats.includes(c) ? B : INK} />
                <Text style={[st.catTxt, { marginLeft: 8, fontSize: 15 }, d.cats.includes(c) && { color: B }]}>{c}</Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
        <View style={st.stickyFooter}>
          <Button title={n ? `Zobrazit ${n} ${n === 1 ? 'věc' : n < 5 ? 'věci' : 'věcí'}` : 'Použít filtry'} style={{ marginBottom: 0 }} onPress={() => onApply(d)} />
        </View>
      </View>
    </Modal>
  );
}


const TABS = [
  ['home', 'home', 'Domů'],
  ['mine', 'cube', 'Moje věci'],
  ['add', 'add', ''],
  ['activity', 'notifications', 'Aktivita'],
  ['profile', 'person', 'Profil'],
];

function MainApp({ ctx }) {
  const pending = ctx.incoming.filter((r) => r.status === 'pending').length;
  const tab = ctx.tab;
  return (
    <SafeAreaView style={st.safe} edges={['top', 'bottom']}>
      <View style={{ flex: 1 }}>
        {tab === 'home' ? <HomeTab ctx={ctx} /> : null}
        {tab === 'mine' ? <MyItemsTab ctx={ctx} /> : null}
        {tab === 'activity' ? <ActivityTab ctx={ctx} /> : null}
        {tab === 'profile' ? <ProfileTab ctx={ctx} /> : null}
      </View>
      <View style={st.tabBar}>
        {TABS.map(([k, e, l]) =>
          k === 'add' ? (
            <Pressable
              key={k}
              onPress={() => {
                tap();
                ctx.openAdd();
              }}
              style={st.tabAdd}
            >
              <Ionicons name="add" size={28} color="#fff" />
            </Pressable>
          ) : (
            <Pressable
              key={k}
              onPress={() => {
                tap();
                ctx.setTab(k);
              }}
              style={st.tabBtn}
            >
              <Ionicons name={tab === k ? e : e + '-outline'} size={24} color={tab === k ? B : '#9A97A6'} />
              <Text style={[st.tabTxt, tab === k && { color: B }]}>{l}</Text>
              {k === 'activity' && pending ? (
                <View style={[st.bellBadge, { top: 0, right: 14 }]}>
                  <Text style={{ color: '#fff', fontSize: 11, fontWeight: '900' }}>{pending}</Text>
                </View>
              ) : null}
            </Pressable>
          )
        )}
      </View>
    </SafeAreaView>
  );
}

function AddItemModal({ ctx }) {
  return (
    <Modal visible={ctx.addOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={ctx.closeAdd}>
      <View style={{ flex: 1, backgroundColor: '#fff', paddingTop: 16 }}>
        <Pressable onPress={ctx.closeAdd} hitSlop={12} style={{ alignSelf: 'flex-end', paddingHorizontal: 24, paddingBottom: 6 }}>
          <Text style={{ fontSize: 17, color: B, fontWeight: '700' }}>Zavřít</Text>
        </Pressable>
        {ctx.addOpen ? (
          <FirstItem
            ctx={ctx}
            title="Co daruješ dnes?"
            hideSkip
            next={() => {
              ctx.closeAdd();
              ctx.setTab('mine');
            }}
          />
        ) : null}
        <View style={{ height: 24 }} />
      </View>
    </Modal>
  );
}


// ---------- Komunita: skutečná čísla z databáze ----------
function CountUp({ to, delay = 0 }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!to) return;
    const a = new Animated.Value(0);
    const id = a.addListener(({ value }) => setV(Math.round(value)));
    Animated.timing(a, { toValue: to, duration: 1800, delay, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
    return () => a.removeListener(id);
  }, [to]);
  return <Text style={[st.bigNum, { fontSize: 40 }]}>{kc(v)}</Text>;
}

function CommunityStep({ next }) {
  const [stats, setStats] = useState(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let stop = () => {};
    api
      .publicStats()
      .then((x) => {
        setStats(x);
        stop = rumble(1900, { delay: 300, end: 'success' });
      })
      .catch(() => setFailed(true));
    return () => stop();
  }, []);
  const people = stats ? stats.people : 0;
  const early = !stats || people < 1000;
  return (
    <StepLayout
      title={early ? 'Buď mezi prvními sousedy' : 'Přidej se k sousedům'}
      subtitle="TAKE.it právě startuje v Česku a na Slovensku. Každá darovaná věc se tu počítá."
      onNext={next}
    >
      <View style={{ flex: 1, justifyContent: 'center' }}>
        {stats ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
            {[
              [stats.items, 'věcí přidáno', '📦'],
              [stats.given, 'věcí předáno', '🤝'],
              [stats.people, 'lidí v TAKE.it', '💜'],
            ].map(([n, l, e], i) => (
              <FadeIn key={l} delay={150 + i * 150} style={[st.statBox, { flexBasis: i === 2 ? '100%' : '47%', flexGrow: 0, marginHorizontal: 0, marginBottom: 12, paddingVertical: 18 }]}>
                <Text style={{ fontSize: 26 }}>{e}</Text>
                <CountUp to={n} delay={300 + i * 150} />
                <Text style={st.chartAxis}>{l}</Text>
              </FadeIn>
            ))}
          </View>
        ) : failed ? (
          <View style={{ alignItems: 'center' }}>
            <Taki size={150} mood="excited" wave />
          </View>
        ) : (
          <ActivityIndicator color={B} />
        )}
        <FadeIn delay={900}>
          <Text style={[st.sub, { textAlign: 'center', marginTop: 16 }]}>
            {early ? 'Jsi u toho od začátku – a tvoje první věc může být ta, která to tu rozjede. 🚀' : 'Čím víc lidí daruje, tím víc věcí najdeš kolem sebe.'}
          </Text>
        </FadeIn>
      </View>
    </StepLayout>
  );
}

// ---------- Mapa sousedů v onboardingu (bez vymyšlených dat) ----------
function NeighborsMap({ next, ctx }) {
  const pulse = useRef(new Animated.Value(0)).current;
  const center = ctx.loc || CENTER;
  useEffect(() => {
    Animated.loop(Animated.timing(pulse, { toValue: 1, duration: 2000, easing: Easing.out(Easing.quad), useNativeDriver: true })).start();
  }, []);
  return (
    <View style={{ flex: 1 }}>
      <MapView
        style={StyleSheet.absoluteFill}
        initialRegion={{ ...center, latitudeDelta: 0.06, longitudeDelta: 0.06 }}
        scrollEnabled={false}
        zoomEnabled={false}
      >
        <MapCircle center={center} radius={2500} fillColor="rgba(112,40,232,0.15)" strokeColor={B} strokeWidth={2} />
        <Marker coordinate={center}>
          <PopIn>
            <PinBubble />
          </PopIn>
        </Marker>
      </MapView>
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
        <Animated.View
          style={{
            width: 220,
            height: 220,
            borderRadius: 110,
            backgroundColor: B,
            opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.22, 0] }),
            transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1.4] }) }],
          }}
        />
      </View>
      <LinearGradient colors={['rgba(255,255,255,0.95)', 'rgba(255,255,255,0)']} style={{ paddingHorizontal: 24, paddingBottom: 60 }} pointerEvents="none">
        <FadeIn>
          <Text style={st.h1}>Darování funguje kolem tebe</Text>
          <Text style={[st.sub, { color: INK }]}>Tvoje věci uvidí sousedé v okolí – a ty zase jejich.</Text>
        </FadeIn>
      </LinearGradient>
      <View style={{ position: 'absolute', left: 24, right: 24, bottom: 0 }}>
        <Button title="Pokračovat" onPress={next} />
      </View>
    </View>
  );
}

function TakeDone({ next }) {
  return (
    <StepLayout title="Hotovo, můžeš začít" subtitle="Ukážeme ti věci zdarma kolem tebe. Když něco najdeš, klepni na „Mám zájem“." cta="Ukázat věci kolem mě" onNext={next} center>
      <View style={{ alignItems: 'center' }}>
        <Taki size={170} mood="excited" wave />
      </View>
    </StepLayout>
  );
}

// ---------- Přihlášení přes Apple ----------
function LoginSheet({ visible, onClose, onSuccess }) {
  const [busy, setBusy] = useState(false);
  const [avail, setAvail] = useState(Platform.OS === 'ios');
  useEffect(() => {
    api.appleAvailable().then(setAvail);
  }, []);
  const go = async () => {
    try {
      setBusy(true);
      const session = await api.signInWithApple();
      success();
      onSuccess(session);
    } catch (e) {
      if (e && e.code !== 'ERR_REQUEST_CANCELED') Alert.alert('Přihlášení se nepovedlo', String(e.message || e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: '#fff', padding: 24, justifyContent: 'center' }}>
        <Pressable onPress={onClose} hitSlop={12} style={{ position: 'absolute', top: 20, right: 24 }}>
          <Text style={{ fontSize: 17, color: B, fontWeight: '700' }}>Zavřít</Text>
        </Pressable>
        <View style={{ alignItems: 'center' }}>
          <AppIcon size={96} />
          <Text style={[st.h1, { textAlign: 'center', marginTop: 24, fontSize: 30 }]}>Přihlas se jedním klepnutím</Text>
          <Text style={[st.sub, { textAlign: 'center' }]}>
            Potřebujeme to, aby žádosti a kontakty došly správnému člověku. Žádné heslo, žádný e-mail navíc.
          </Text>
        </View>
        <View style={{ marginTop: 36, alignItems: 'center' }}>
          {avail ? (
            busy ? (
              <ActivityIndicator color={B} />
            ) : (
              <AppleAuthentication.AppleAuthenticationButton
                buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
                buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                cornerRadius={28}
                style={{ width: W - 48, height: 56 }}
                onPress={go}
              />
            )
          ) : (
            <Text style={[st.chartAxis, { textAlign: 'center' }]}>Přihlášení na tomhle zařízení zatím nejde. Verze pro Android bude brzy.</Text>
          )}
        </View>
        <Text style={[st.chartAxis, { textAlign: 'center', marginTop: 20, fontSize: 12 }]}>
          Pokračováním souhlasíš s{' '}
          <Text style={{ color: B, fontWeight: '700' }} onPress={() => Linking.openURL(TERMS_URL)}>podmínkami</Text> a{' '}
          <Text style={{ color: B, fontWeight: '700' }} onPress={() => Linking.openURL(PRIVACY_URL)}>zásadami ochrany soukromí</Text>.
        </Text>
      </View>
    </Modal>
  );
}

// ---------- Přidání věci ----------
function FirstItem({ next, ctx, title: heading = 'Daruj svou první věc', hideSkip }) {
  const saved = ctx.contact || {};
  const [photos, setPhotos] = useState([]);
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [cat, setCat] = useState(null);
  const [chip, setChip] = useState('U dveří');
  const [methods, setMethods] = useState((saved.methods && saved.methods.length ? saved.methods : ['whatsapp']).filter((m) => CONTACTS.some((c) => c.id === m)));
  const [phone, setPhone] = useState(saved.phone || '+420 ');
  const [messenger, setMessenger] = useState(saved.messenger || '');
  const [busy, setBusy] = useState(false);
  const pick = async () => {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: true, selectionLimit: 5, quality: 0.8 });
      if (!res.canceled) setPhotos([...photos, ...res.assets.map((a) => a.uri)].slice(0, 5));
    } catch (e) {
      Alert.alert('Fotky', 'Nepodařilo se otevřít galerii.');
    }
  };
  const toggle = (id) => setMethods(methods.includes(id) ? methods.filter((m) => m !== id) : [...methods, id]);
  const needPhone = methods.some((m) => ['whatsapp', 'phone', 'sms'].includes(m));
  const needMessenger = methods.includes('messenger');
  const phoneOk = !needPhone || phone.replace(/[^0-9]/g, '').length >= 9;
  const messengerOk = !needMessenger || isFbLink(messenger);
  const valid = title.trim().length >= 2 && photos.length > 0 && cat && methods.length > 0 && phoneOk && messengerOk;
  const chips = [['enter-outline', 'U dveří'], ['time-outline', 'Kdykoli dnes'], ['cube-outline', 'Před domem']];
  const publish = () =>
    ctx.requireLogin(async (uid) => {
      try {
        setBusy(true);
        const contact = { methods, phone: needPhone ? phone.trim() : '', messenger: needMessenger ? messenger.trim() : '' };
        await api.saveContact(uid, contact);
        const loc = ctx.loc || CENTER;
        await api.createItem(uid, { title: title.trim(), description: desc.trim(), category: cat, pickup: chip, photos, lat: loc.latitude, lng: loc.longitude });
        await ctx.refresh();
        success();
        next();
      } catch (e) {
        Alert.alert('Nepovedlo se zveřejnit', String(e.message || e));
      } finally {
        setBusy(false);
      }
    });
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 12 }} keyboardShouldPersistTaps="handled">
        <FadeIn>
          <Text style={[st.h1, { fontSize: 28, lineHeight: 34 }]}>{heading}</Text>
        </FadeIn>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 14 }}>
          <Pressable onPress={pick} style={st.addPhoto}>
            <Ionicons name="camera-outline" size={26} color={SUB} />
            <Text style={{ fontSize: 12, fontWeight: '700', color: SUB, marginTop: 2 }}>{photos.length ? `${photos.length}/5` : 'Přidat'}</Text>
          </Pressable>
          {photos.map((u, k) => (
            <Pressable key={u} onLongPress={() => setPhotos(photos.filter((x) => x !== u))}>
              <Image source={{ uri: u }} style={st.smallThumb} />
              {k === 0 ? (
                <View style={st.coverTag}>
                  <Text style={{ color: '#fff', fontSize: 10, fontWeight: '800' }}>Titulní</Text>
                </View>
              ) : null}
            </Pressable>
          ))}
        </ScrollView>
        <TextInput value={title} onChangeText={setTitle} placeholder="Co daruješ?" placeholderTextColor="#B5B5BA" maxLength={80} style={[st.input, st.inputSm]} />
        <TextInput
          value={desc}
          onChangeText={setDesc}
          placeholder="Stav, velikost, poznámka…"
          placeholderTextColor="#B5B5BA"
          maxLength={1000}
          style={[st.input, st.inputSm, { height: 64, textAlignVertical: 'top' }]}
          multiline
        />
        <Text style={st.label}>Kategorie</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {CATEGORIES.map(([e, c]) => (
            <Pressable
              key={c}
              onPress={() => {
                tap();
                setCat(c);
              }}
              style={[st.chipSm, cat === c && st.chipSel]}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}><Ionicons name={CAT_ICON[c]} size={15} color={cat === c ? '#fff' : INK} /><Text style={[st.chipSmTxt, { marginLeft: 5 }, cat === c && { color: '#fff' }]}>{c}</Text></View>
            </Pressable>
          ))}
        </ScrollView>
        <Text style={st.label}>Vyzvednutí</Text>
        <View style={{ flexDirection: 'row' }}>
          {chips.map(([e, l]) => (
            <Pressable
              key={l}
              onPress={() => {
                tap();
                setChip(l);
              }}
              style={[st.chipSm, chip === l && st.chipSel]}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}><Ionicons name={e} size={15} color={chip === l ? '#fff' : INK} /><Text style={[st.chipSmTxt, { marginLeft: 5 }, chip === l && { color: '#fff' }]} numberOfLines={1}>{l}</Text></View>
            </Pressable>
          ))}
        </View>
        <Text style={st.label}>Jak tě můžou kontaktovat?</Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          {CONTACTS.map((c) => {
            const on = methods.includes(c.id);
            return (
              <Pressable
                key={c.id}
                onPress={() => {
                  tap();
                  toggle(c.id);
                }}
                style={{ alignItems: 'center', width: (W - 48) / 4 }}
              >
                <View style={[st.contactCircle, on && { backgroundColor: c.color, borderColor: c.color }]}>
                  <Ionicons name={c.icon} size={24} color={on ? '#fff' : c.color} />
                </View>
                <Text style={[st.contactTxt, { marginTop: 4 }, on && { color: INK }]}>{c.label}</Text>
              </Pressable>
            );
          })}
        </View>
        {needPhone ? (
          <TextInput value={phone} onChangeText={setPhone} placeholder="Telefonní číslo" placeholderTextColor="#B5B5BA" keyboardType="phone-pad" style={[st.input, st.inputSm, !phoneOk && phone.length > 5 && st.inputErr]} />
        ) : null}
        {needMessenger ? (
          <TextInput
            value={messenger}
            onChangeText={setMessenger}
            placeholder="Odkaz na Facebook profil (facebook.com/…)"
            placeholderTextColor="#B5B5BA"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            style={[st.input, st.inputSm, !messengerOk && messenger.length > 3 && st.inputErr]}
          />
        ) : null}
        <IconLine icon="lock-closed-outline" text="Kontakt uvidí jen ten, koho potvrdíš. Poloha se ukazuje jen přibližně." style={{ marginTop: 8 }} />
      </ScrollView>
      <View style={{ paddingHorizontal: 24, paddingTop: 6 }}>
        {hideSkip ? null : (
          <Pressable onPress={next} hitSlop={10}>
            <Text style={[st.secondary, { marginBottom: 12, fontSize: 15 }]}>Udělám to později</Text>
          </Pressable>
        )}
        <Button title={busy ? 'Nahrávám…' : 'Zveřejnit'} disabled={!valid || busy} onPress={publish} />
      </View>
    </KeyboardAvoidingView>
  );
}

// ---------- Detail věci ----------
const REPORT_REASONS = ['Nevhodný obsah', 'Podvod nebo spam', 'Věc se prodává', 'Zakázaná věc', 'Jiný důvod'];

function ItemDetail({ item, onClose, ctx }) {
  const [asking, setAsking] = useState(false);
  const [msg, setMsg] = useState('Ahoj, můžu si to vyzvednout dnes večer?');
  const [contact, setContact] = useState(null);
  const [busy, setBusy] = useState(false);
  const status = item ? ctx.outgoing[item.id] : null;
  useEffect(() => {
    setAsking(false);
    setContact(null);
    if (!item) return;
    if (!item.own && ctx.myId) api.incrementView(item.id);
  }, [item && item.id]);
  useEffect(() => {
    if (item && (item.own || status === 'accepted')) api.getContact(item.id).then(setContact).catch(() => {});
  }, [item && item.id, status]);
  if (!item) return null;
  const own = item.own;
  const incoming = ctx.incoming.filter((r) => r.item_id === item.id);
  const pending = incoming.filter((r) => r.status === 'pending').length;
  const methods = (contact && contact.methods) || [];
  const lat = item.lat || CENTER.latitude;
  const lng = item.lng || CENTER.longitude;
  const share = () => Share.share({ message: `Na TAKE.it je zdarma „${item.t}“. Mrkni do appky!` }).catch(() => {});
  const more = () => {
    if (own) return;
    Alert.alert(item.t, null, [
      {
        text: 'Nahlásit inzerát',
        onPress: () =>
          Alert.alert('Proč ho hlásíš?', null, [
            ...REPORT_REASONS.map((r) => ({ text: r, onPress: () => ctx.report(item, r) })),
            { text: 'Zrušit', style: 'cancel' },
          ]),
      },
      {
        text: `Zablokovat uživatele ${item.owner_name}`,
        style: 'destructive',
        onPress: () => {
          ctx.block(item.owner_id);
          onClose();
        },
      },
      { text: 'Zrušit', style: 'cancel' },
    ]);
  };
  const send = () =>
    ctx.requireLogin(async (uid) => {
      try {
        setBusy(true);
        await ctx.requestItem(item, msg.trim(), uid);
      } finally {
        setBusy(false);
      }
    });

  let footer = null;
  if (own) {
    footer =
      item.status === 'reserved' ? (
        <Button title="Označit jako předané" style={{ marginBottom: 0 }} onPress={() => { ctx.markGiven(item.id); onClose(); }} />
      ) : pending ? (
        <Button title={`Zobrazit zájemce (${pending})`} style={{ marginBottom: 0 }} onPress={() => { onClose(); ctx.openInbox(); }} />
      ) : null;
  } else if (status === 'accepted') {
    footer = methods.length ? (
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
        {CONTACTS.filter((c) => methods.includes(c.id)).map((c) => (
          <Pressable
            key={c.id}
            onPress={() => {
              tap();
              openContact(c.id, item, contact);
            }}
            style={({ pressed }) => [st.contactBtn, { backgroundColor: c.color, flex: 1, marginHorizontal: 4, marginTop: 0 }, pressed && { opacity: 0.85 }]}
          >
            <Ionicons name={c.icon} size={18} color="#fff" />
            <Text style={[st.contactBtnTxt, { fontSize: 15, marginLeft: 6 }]}>{c.label}</Text>
          </Pressable>
        ))}
      </View>
    ) : (
      <ActivityIndicator color={B} />
    );
  } else if (status === 'pending') {
    footer = (
      <View style={[st.statusCard, { flexDirection: 'row', justifyContent: 'center', paddingVertical: 16 }]}>
        <ActivityIndicator color={B} />
        <Text style={[st.h2, { marginLeft: 10, fontSize: 16 }]}>Čekáme na potvrzení dárce…</Text>
      </View>
    );
  } else if (status === 'declined') {
    footer = (
      <View style={[st.statusCard, { paddingVertical: 16 }]}>
        <Text style={[st.h2, { fontSize: 16 }]}>Dárce vybral někoho jiného</Text>
      </View>
    );
  } else if (item.status !== 'active') {
    footer = (
      <View style={[st.statusCard, { paddingVertical: 16 }]}>
        <Text style={[st.h2, { fontSize: 16 }]}>Už je zamluvená</Text>
      </View>
    );
  } else if (asking) {
    footer = <Button title={busy ? 'Odesílám…' : 'Odeslat žádost'} disabled={!msg.trim() || busy} style={{ marginBottom: 0 }} onPress={send} />;
  } else {
    footer = <Button title="Mám zájem" style={{ marginBottom: 0 }} onPress={() => setAsking(true)} />;
  }

  return (
    <Modal visible={!!item} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1, backgroundColor: '#fff' }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ paddingBottom: 30 }} keyboardShouldPersistTaps="handled">
          <View>
            <Gallery item={item} height={340} />
            <View style={st.detailTopBar}>
              <Pressable onPress={onClose} hitSlop={10} style={st.roundBtn} accessibilityLabel="Zavřít">
                <Ionicons name="close" size={22} color={INK} />
              </Pressable>
              <View style={{ flexDirection: 'row' }}>
                <Pressable onPress={share} hitSlop={10} style={[st.roundBtn, { marginRight: 10 }]} accessibilityLabel="Sdílet">
                  <Ionicons name="share-outline" size={20} color={INK} />
                </Pressable>
                {!own ? (
                  <Pressable onPress={more} hitSlop={10} style={st.roundBtn} accessibilityLabel="Další možnosti">
                    <Ionicons name="ellipsis-horizontal" size={20} color={INK} />
                  </Pressable>
                ) : null}
              </View>
            </View>
          </View>

          <View style={{ padding: 24 }}>
            <Text style={st.h1}>{item.t}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 10 }}>
              <View style={[st.metaChip, { backgroundColor: '#DDF7E5' }]}>
                <Text style={{ color: GREEN, fontWeight: '900' }}>ZDARMA</Text>
              </View>
              <View style={st.metaChip}>
                <Ionicons name="location-outline" size={14} color={INK} />
                <Text style={[st.metaTxt, { marginLeft: 4 }]}>{own ? 'Tvoje věc' : item.kmText}</Text>
              </View>
              <View style={st.metaChip}>
                <Ionicons name="time-outline" size={14} color={INK} />
                <Text style={[st.metaTxt, { marginLeft: 4 }]}>{ago(item.created_at)}</Text>
              </View>
              {item.chip ? (
                <View style={st.metaChip}>
                  <Ionicons name="enter-outline" size={14} color={INK} />
                  <Text style={[st.metaTxt, { marginLeft: 4 }]}>{item.chip}</Text>
                </View>
              ) : null}
            </View>

            <View style={st.donorCard}>
              <View style={st.avatar}>
                <Text style={{ fontSize: 20, fontWeight: '900', color: B }}>{(item.owner_name || '?').trim()[0].toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={st.h2}>{own ? 'Tvoje věc' : item.owner_name}</Text>
                <Text style={st.chartAxis}>{own ? `${item.views} zobrazení` : 'Daruje přes TAKE.it'}</Text>
              </View>
            </View>

            {item.d ? (
              <>
                <Text style={st.section}>Popis</Text>
                <Text style={st.body}>{item.d}</Text>
              </>
            ) : null}

            <Text style={st.section}>Kde to je</Text>
            <View style={st.miniMap}>
              <MapView
                style={StyleSheet.absoluteFill}
                pointerEvents="none"
                initialRegion={{ latitude: lat, longitude: lng, latitudeDelta: 0.025, longitudeDelta: 0.025 }}
                scrollEnabled={false}
                zoomEnabled={false}
              >
                <MapCircle center={{ latitude: lat, longitude: lng }} radius={600} fillColor="rgba(112,40,232,0.18)" strokeColor={B} strokeWidth={2} />
              </MapView>
            </View>
            <IconLine icon="lock-closed-outline" text="Přesné místo ti dárce pošle až po potvrzení." style={{ marginTop: 8 }} />

            {own ? (
              <View style={[st.chartCard, { marginTop: 22 }]}>
                <Text style={st.h2}>Stav</Text>
                <Text style={st.chartAxis}>
                  {item.status === 'given'
                    ? 'Předáno – díky, že posíláš věci dál!'
                    : item.status === 'reserved'
                    ? 'Rezervováno – zájemce dostal tvůj kontakt.'
                    : incoming.length
                    ? `${incoming.length} zájemci${pending ? ` • čeká ${pending}` : ''}`
                    : 'Zatím bez zájemců. Jakmile se někdo ozve, přijde ti upozornění.'}
                </Text>
                {item.status !== 'given' ? (
                  <Pressable
                    onPress={() =>
                      Alert.alert('Smazat inzerát?', 'Tohle nejde vrátit.', [
                        { text: 'Zrušit', style: 'cancel' },
                        { text: 'Smazat', style: 'destructive', onPress: () => { ctx.deleteItem(item.id); onClose(); } },
                      ])
                    }
                    hitSlop={10}
                  >
                    <Text style={[st.secondary, { marginTop: 14, marginBottom: 0, color: '#FF3B30', textAlign: 'left' }]}>Smazat inzerát</Text>
                  </Pressable>
                ) : null}
              </View>
            ) : null}

            {!own && status === 'accepted' ? (
              <View style={[st.statusCard, { marginTop: 22, backgroundColor: '#DDF7E5' }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}><Ionicons name="checkmark-circle" size={22} color={GREEN} /><Text style={[st.h2, { marginLeft: 8 }]}>Dárce potvrdil – je to tvoje!</Text></View>
                <Text style={st.chartAxis}>Kontakt je odemčený, ozvi se mu tlačítkem dole.</Text>
              </View>
            ) : null}

            {!own && !status && asking ? (
              <FadeIn style={{ marginTop: 22 }}>
                <Text style={st.section}>Zpráva pro {item.owner_name}</Text>
                <TextInput value={msg} onChangeText={setMsg} multiline autoFocus maxLength={500} style={[st.input, { height: 90, textAlignVertical: 'top' }]} />
              </FadeIn>
            ) : null}
            {!own && !status && !asking && item.status === 'active' ? (
              <IconLine icon="lock-closed-outline" text="Kontakt na dárce se odemkne, až potvrdí tvoji žádost." style={{ marginTop: 18 }} />
            ) : null}
          </View>
        </ScrollView>
        {footer ? <View style={st.stickyFooter}>{footer}</View> : null}
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ---------- Po zveřejnění ----------
function Given({ ctx, onContinue }) {
  const item = ctx.myItems[0];
  return (
    <SafeAreaView style={st.safe} edges={['top', 'bottom']}>
      <View style={{ flex: 1, paddingHorizontal: 24, justifyContent: 'center' }}>
        <FadeIn style={{ alignItems: 'center' }}>
          <Taki size={120} mood="excited" jump={1} />
          <Text style={[st.h1, { textAlign: 'center', marginTop: 8 }]}>{item ? 'Tvoje věc je venku!' : 'Vše nastaveno!'}</Text>
          <Text style={[st.sub, { textAlign: 'center' }]}>
            {item ? 'Dáme ti vědět, jakmile si o ni někdo řekne.' : 'Věc můžeš přidat kdykoli tlačítkem + dole.'}
          </Text>
        </FadeIn>
        {item ? (
          <FadeIn delay={250} style={[st.itemCard, { marginTop: 24, flexDirection: 'row', alignItems: 'center' }]}>
            <Thumb item={item} emojiSize={40} style={{ width: 88, height: 88 }} />
            <View style={{ padding: 14, flex: 1 }}>
              <Text style={st.itemTitle}>{item.t}</Text>
              <Text style={{ color: GREEN, fontWeight: '800', marginTop: 4 }}>Zdarma</Text>
              <Text style={st.itemMeta}>{item.cat} • {item.chip}</Text>
            </View>
          </FadeIn>
        ) : null}
      </View>
      <View style={{ paddingHorizontal: 24 }}>
        <Button title="Pokračovat do appky" onPress={onContinue} />
      </View>
    </SafeAreaView>
  );
}

// ---------- Domů ----------
function HomeTab({ ctx }) {
  const [open, setOpen] = useState(null);
  const [q, setQ] = useState('');
  const [f, setF] = useState({ cats: [], km: ctx.data.km || 20, sort: 'new' });
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [view, setView] = useState('list');
  const [sel, setSel] = useState(null);
  const items = ctx.feed.map((x) =>
    x.own
      ? { ...x, badge: x.status === 'reserved' ? 'REZERVOVÁNO' : 'TVOJE', badgeColor: x.status === 'reserved' ? '#FF9500' : B }
      : ctx.outgoing[x.id] === 'accepted'
      ? { ...x, badge: 'TVOJE', badgeColor: B }
      : ctx.outgoing[x.id] === 'pending'
      ? { ...x, badge: 'ČEKÁ', badgeColor: '#FF9500' }
      : x.status === 'reserved'
      ? { ...x, badge: 'ZAMLUVENO', badgeColor: SUB }
      : x
  );
  const current = open ? items.find((x) => x.id === open.id) || open : null;
  const dist = (x) => (x.distance == null ? 0 : x.distance);
  const matches = (x, nf) => (!nf.cats.length || nf.cats.includes(x.cat)) && dist(x) <= nf.km;
  const filtered = items
    .filter((x) => {
      if (q.trim() && !(x.t + ' ' + (x.cat || '') + ' ' + (x.d || '')).toLowerCase().includes(q.trim().toLowerCase())) return false;
      return x.own || matches(x, f);
    })
    .sort((a, b) => (f.sort === 'near' ? dist(a) - dist(b) : new Date(b.created_at) - new Date(a.created_at)));
  const activeFilters = f.cats.length + (f.km < 20 ? 1 : 0) + (f.sort !== 'new' ? 1 : 0);
  // Když v okruhu nic není, ukážeme nejbližší věci kousek dál (místo prázdné obrazovky)
  const textOk = (x) => !q.trim() || (x.t + ' ' + (x.cat || '') + ' ' + (x.d || '')).toLowerCase().includes(q.trim().toLowerCase());
  const farther = filtered.length
    ? []
    : items
        .filter((x) => !x.own && textOk(x) && (!f.cats.length || f.cats.includes(x.cat)) && dist(x) > f.km)
        .sort((a, b) => dist(a) - dist(b))
        .slice(0, 20);
  const invite = () => Share.share({ message: 'Dávám věci, co nepotřebuju, zadarmo sousedům přes TAKE.it. Přidej se a pošli to dál 💜' }).catch(() => {});
  const quick = ['Vše', ...CATEGORIES.map(([e, c]) => c)];
  return (
    <View style={{ flex: 1 }}>
      <Header />
      <View style={{ paddingHorizontal: 24 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={st.searchBox}>
            <Ionicons name="search" size={18} color="#9A9AA0" />
            <TextInput
              value={q}
              onChangeText={setQ}
              placeholder="Hledat věci…"
              placeholderTextColor="#9A9AA0"
              allowFontScaling={false}
              style={{ flex: 1, fontSize: 17, marginLeft: 8, color: INK, paddingVertical: 12 }}
              returnKeyType="search"
              clearButtonMode="never"
            />
            {q ? (
              <Pressable onPress={() => setQ('')} hitSlop={10} accessibilityLabel="Smazat hledání">
                <Ionicons name="close-circle" size={18} color="#B5B5BA" />
              </Pressable>
            ) : null}
          </View>
          <Pressable
            onPress={() => {
              tap();
              setFiltersOpen(true);
            }}
            style={[st.filterBtn, activeFilters ? { backgroundColor: B } : null]}
            accessibilityLabel="Filtry"
          >
            <Ionicons name="options-outline" size={21} color={activeFilters ? '#fff' : INK} />
            {activeFilters ? (
              <View style={[st.bellBadge, { top: -5, right: -5 }]}>
                <Text style={{ color: '#fff', fontSize: 11, fontWeight: '900' }}>{activeFilters}</Text>
              </View>
            ) : null}
          </Pressable>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10, marginHorizontal: -24 }} contentContainerStyle={{ paddingHorizontal: 24 }}>
          {quick.map((c) => {
            const on = c === 'Vše' ? f.cats.length === 0 : f.cats.length === 1 && f.cats[0] === c;
            return (
              <Pressable
                key={c}
                onPress={() => {
                  tap();
                  setF({ ...f, cats: c === 'Vše' ? [] : [c] });
                }}
                style={[st.quickChip, on && st.quickChipOn]}
              >
                <Text style={[st.quickTxt, on && { color: '#fff' }]}>{c}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: 12 }}>
          <Text style={st.chartAxis}>
            {filtered.length} {filtered.length === 1 ? 'věc' : filtered.length < 5 && filtered.length > 0 ? 'věci' : 'věcí'} • do {f.km} km
          </Text>
          <View style={[st.segment, { marginBottom: 0, width: 190 }]}>
            {[
              ['list', 'Seznam', 'grid-outline'],
              ['map', 'Mapa', 'map-outline'],
            ].map(([k, l, ic]) => (
              <Pressable
                key={k}
                onPress={() => {
                  tap();
                  setView(k);
                  setSel(null);
                }}
                style={[st.segBtn, view === k && st.segBtnOn]}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name={ic} size={15} color={view === k ? INK : SUB} />
                  <Text style={[st.segTxt, { marginLeft: 5 }, view === k && { color: INK }]}>{l}</Text>
                </View>
              </Pressable>
            ))}
          </View>
        </View>
      </View>
      {view === 'map' ? (
        <ItemsMap
          items={filtered}
          center={ctx.loc || CENTER}
          selected={sel}
          onSelect={(it) => {
            tap();
            setSel(it);
          }}
          onOpen={(it) => setOpen(it)}
        />
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 30 }}
          keyboardShouldPersistTaps="handled"
          refreshControl={<RefreshControl refreshing={ctx.refreshing} onRefresh={ctx.refresh} tintColor={B} />}
        >
          {ctx.loadingFeed && !items.length ? (
            <ActivityIndicator color={B} style={{ marginTop: 40 }} />
          ) : filtered.length === 0 && farther.length ? (
            <>
              <View style={st.notice}>
                <Ionicons name="navigate-circle-outline" size={22} color={B} />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={st.noticeTitle}>Do {f.km} km zatím nic</Text>
                  <Text style={st.noticeTxt}>Tohle je nejblíž – od {Math.ceil(dist(farther[0]))} km. Až se něco objeví blíž, uvidíš to nahoře.</Text>
                </View>
              </View>
              <Grid
                items={farther}
                onItem={(it) => {
                  tap();
                  setOpen(it);
                }}
              />
            </>
          ) : filtered.length === 0 ? (
            <View style={{ alignItems: 'center', marginTop: 40 }}>
              <Taki size={100} mood={items.length ? 'think' : 'happy'} />
              <Text style={[st.h2, { marginTop: 10, textAlign: 'center' }]}>{items.length ? 'Nic jsme nenašli' : 'Buď první v okolí'}</Text>
              <Text style={[st.chartAxis, { textAlign: 'center' }]}>
                {items.length ? 'Zkus jiné slovo nebo uvolni filtry.' : 'TAKE.it tu teprve začíná. Tvoje první věc uvidí všichni sousedé kolem.'}
              </Text>
              {items.length ? (
                <Button title="Zrušit filtry" light style={{ marginTop: 16, paddingHorizontal: 30 }} onPress={() => { setQ(''); setF({ cats: [], km: 20, sort: 'new' }); }} />
              ) : (
                <>
                  <Button title="Darovat první věc" style={{ marginTop: 16, paddingHorizontal: 30 }} onPress={ctx.openAdd} />
                  <Pressable onPress={invite} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12 }}>
                    <Ionicons name="share-outline" size={18} color={B} />
                    <Text style={{ color: B, fontWeight: '700', fontSize: 16, marginLeft: 6 }}>Pozvat sousedy</Text>
                  </Pressable>
                </>
              )}
            </View>
          ) : (
            <Grid
              items={filtered}
              onItem={(it) => {
                tap();
                setOpen(it);
              }}
            />
          )}
        </ScrollView>
      )}
      <ItemDetail item={current} onClose={() => setOpen(null)} ctx={ctx} />
      <FiltersSheet
        visible={filtersOpen}
        value={f}
        count={(nf) => items.filter((x) => !x.own && matches(x, nf)).length}
        onClose={() => setFiltersOpen(false)}
        onApply={(nf) => {
          setF(nf);
          setFiltersOpen(false);
        }}
      />
    </View>
  );
}

// ---------- Moje věci ----------
const STATUS_TABS = [
  ['active', 'Aktivní'],
  ['reserved', 'Rezervované'],
  ['given', 'Předané'],
];

function MyItemsTab({ ctx }) {
  const [seg, setSeg] = useState('active');
  const [open, setOpen] = useState(null);
  const list = ctx.myItems.filter((x) => x.status === seg);
  const current = open ? ctx.myItems.find((x) => x.id === open) || null : null;
  if (!ctx.myId) {
    return (
      <View style={{ flex: 1 }}>
        <Header title="Moje věci" />
        <LoginPrompt ctx={ctx} text="Přihlas se a daruj první věc. Tady pak uvidíš její stav a zájemce." />
      </View>
    );
  }
  return (
    <View style={{ flex: 1 }}>
      <Header title="Moje věci" />
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 30 }}
        refreshControl={<RefreshControl refreshing={ctx.refreshing} onRefresh={ctx.refresh} tintColor={B} />}
      >
        <View style={st.segment}>
          {STATUS_TABS.map(([k, l]) => {
            const c = ctx.myItems.filter((x) => x.status === k).length;
            return (
              <Pressable
                key={k}
                onPress={() => {
                  tap();
                  setSeg(k);
                }}
                style={[st.segBtn, seg === k && st.segBtnOn]}
              >
                <Text style={[st.segTxt, seg === k && { color: INK }]}>
                  {l}
                  {c ? ` ${c}` : ''}
                </Text>
              </Pressable>
            );
          })}
        </View>
        {list.length === 0 ? (
          <View style={{ alignItems: 'center', marginTop: 40 }}>
            <Taki size={100} mood="happy" />
            <Text style={[st.h2, { marginTop: 10 }]}>{seg === 'active' ? 'Nic tu zatím není' : seg === 'reserved' ? 'Žádné rezervace' : 'Zatím nic předaného'}</Text>
            {seg === 'active' ? <Button title="Darovat věc" style={{ marginTop: 16, paddingHorizontal: 30 }} onPress={ctx.openAdd} /> : null}
          </View>
        ) : null}
        {list.map((it, i) => {
          const req = ctx.incoming.filter((r) => r.item_id === it.id);
          const pend = req.filter((r) => r.status === 'pending').length;
          return (
            <FadeIn key={it.id} delay={i * 60}>
              <Pressable
                onPress={() => {
                  tap();
                  setOpen(it.id);
                }}
                style={[st.itemCard, { flexDirection: 'row', alignItems: 'center', marginBottom: 12 }]}
              >
                <Thumb item={it} emojiSize={34} style={{ width: 80, height: 80 }} />
                <View style={{ padding: 12, flex: 1 }}>
                  <Text style={st.itemTitle}>{it.t}</Text>
                  <Text style={st.itemMeta}>
                    {it.status === 'given' ? 'Předáno' : it.status === 'reserved' ? 'Rezervováno' : `${it.views} zobrazení • ${req.length} ${req.length === 1 ? 'zájemce' : 'zájemců'}`}
                  </Text>
                  {pend ? <Text style={[st.itemMeta, { color: B, fontWeight: '800' }]}>Čeká na tebe {pend} {pend === 1 ? 'žádost' : 'žádosti'}</Text> : null}
                </View>
                <Text style={{ fontSize: 22, color: '#C7C7CC', marginRight: 12 }}>›</Text>
              </Pressable>
            </FadeIn>
          );
        })}
      </ScrollView>
      <ItemDetail item={current} onClose={() => setOpen(null)} ctx={ctx} />
    </View>
  );
}

function LoginPrompt({ ctx, text }) {
  return (
    <View style={{ alignItems: 'center', paddingHorizontal: 32, marginTop: 60 }}>
      <AppIcon size={80} />
      <Text style={[st.h2, { marginTop: 18, textAlign: 'center' }]}>Ještě nejsi přihlášený</Text>
      <Text style={[st.chartAxis, { textAlign: 'center', marginTop: 6 }]}>{text}</Text>
      <Button title="Přihlásit se" style={{ marginTop: 18, alignSelf: 'stretch' }} onPress={() => ctx.requireLogin(() => {})} />
    </View>
  );
}

// ---------- Aktivita ----------
function ActivityTab({ ctx }) {
  const [open, setOpen] = useState(null);
  if (!ctx.myId) {
    return (
      <View style={{ flex: 1 }}>
        <Header title="Aktivita" />
        <LoginPrompt ctx={ctx} text="Tady uvidíš, kdo chce tvoje věci, a jak dopadly tvoje žádosti." />
      </View>
    );
  }
  return (
    <View style={{ flex: 1 }}>
      <Header title="Aktivita" />
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 30 }}
        refreshControl={<RefreshControl refreshing={ctx.refreshing} onRefresh={ctx.refresh} tintColor={B} />}
      >
        {ctx.incoming.length === 0 && ctx.outgoingList.length === 0 ? (
          <View style={{ alignItems: 'center', marginTop: 40 }}>
            <Taki size={100} mood="think" />
            <Text style={[st.h2, { marginTop: 10 }]}>Zatím tu je klid</Text>
            <Text style={[st.chartAxis, { textAlign: 'center', paddingHorizontal: 12 }]}>Tady uvidíš, kdo chce tvoje věci, a jak dopadly tvoje žádosti.</Text>
            <Button title="Projít věci v okolí" style={{ marginTop: 16, paddingHorizontal: 30 }} onPress={() => ctx.setTab('home')} />
          </View>
        ) : (
        <>
        <Text style={st.section}>Žádosti o tvoje věci</Text>
        {ctx.incoming.length === 0 ? <Text style={st.chartAxis}>Zatím nikdo. Jakmile se někdo přihlásí, přijde ti upozornění.</Text> : null}
        {ctx.incoming.map((r, i) => (
          <FadeIn key={r.id} delay={i * 60} style={[st.reqCard, r.status === 'declined' && { opacity: 0.5 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={st.avatar}>
                <Text style={{ fontSize: 20, fontWeight: '900', color: B }}>{((r.requester && r.requester.name) || '?').trim()[0].toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={st.h2}>{(r.requester && r.requester.name) || 'Soused'}</Text>
                <Text style={st.chartAxis}>chce „{r.item && r.item.title}“ • {ago(r.created_at)}</Text>
              </View>
            </View>
            {r.message ? <Text style={[st.body, { marginTop: 10 }]}>„{r.message}“</Text> : null}
            {r.requester ? <ReasonChips reasons={r.requester.take_reasons} /> : null}
            {r.requester && r.requester.about ? (
              <View style={st.aboutQuote}>
                <Text style={[st.chartAxis, { marginTop: 0, color: INK, lineHeight: 20 }]}>{r.requester.about}</Text>
              </View>
            ) : null}
            {r.status === 'pending' ? (
              <View style={{ flexDirection: 'row', marginTop: 12 }}>
                <Button title="Potvrdit" style={{ flex: 1, height: 48, marginRight: 8, marginBottom: 0 }} onPress={() => ctx.accept(r.id)} />
                <Button title="Odmítnout" light style={{ flex: 1, height: 48, marginBottom: 0 }} onPress={() => ctx.decline(r.id)} />
              </View>
            ) : (
              <Text style={[st.chartAxis, { marginTop: 10, fontWeight: '700', color: r.status === 'accepted' ? GREEN : SUB }]}>
                {r.status === 'accepted' ? 'Potvrzeno – zájemce vidí tvůj kontakt' : 'Odmítnuto'}
              </Text>
            )}
          </FadeIn>
        ))}
        <Text style={[st.section, { marginTop: 28 }]}>Tvoje žádosti</Text>
        {ctx.outgoingList.length === 0 ? <Text style={st.chartAxis}>O nic sis zatím neřekl. Klepni na věc a dej „Mám zájem“.</Text> : null}
        {ctx.outgoingList.map((r) =>
          r.item ? (
            <Pressable key={r.id} onPress={() => setOpen(mapItem(r.item, ctx.myId))} style={[st.reqCard, { flexDirection: 'row', alignItems: 'center' }]}>
              <Thumb item={mapItem(r.item, ctx.myId)} emojiSize={24} style={[st.avatar, { borderRadius: 14 }]} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={st.h2}>{r.item.title}</Text>
                <Text style={[st.chartAxis, r.status === 'accepted' && { color: GREEN, fontWeight: '700' }]}>
                  {r.status === 'accepted' ? 'Dárce potvrdil – klepni pro kontakt' : r.status === 'pending' ? 'Čeká na potvrzení dárce' : 'Dárce vybral někoho jiného'}
                </Text>
              </View>
            </Pressable>
          ) : null
        )}
        </>
        )}
      </ScrollView>
      <ItemDetail item={open} onClose={() => setOpen(null)} ctx={ctx} />
    </View>
  );
}

function AboutSheet({ visible, profile, onClose, onSave }) {
  const [reasons, setReasons] = useState([]);
  const [about, setAbout] = useState('');
  useEffect(() => {
    if (visible) {
      setReasons((profile && profile.take_reasons) || []);
      setAbout((profile && profile.about) || '');
    }
  }, [visible]);
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1, backgroundColor: '#fff' }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={st.inboxHeader}>
          <Pressable onPress={onClose} hitSlop={10}>
            <Text style={{ color: SUB, fontWeight: '700', fontSize: 16 }}>Zrušit</Text>
          </Pressable>
          <Text style={st.h2}>O mně</Text>
          <Pressable onPress={() => onSave(about.trim(), reasons)} hitSlop={10}>
            <Text style={{ color: B, fontWeight: '700', fontSize: 16 }}>Uložit</Text>
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={{ padding: 24 }} keyboardShouldPersistTaps="handled">
          <Text style={[st.label, { marginTop: 0 }]}>Proč hledáš věci zdarma?</Text>
          <AboutEditor reasons={reasons} setReasons={setReasons} about={about} setAbout={setAbout} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ---------- Profil ----------
function ProfileTab({ ctx, onRestart }) {
  const p = ctx.profile;
  const [name, setName] = useState((p && p.name) || '');
  const [editing, setEditing] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  useEffect(() => setName((p && p.name) || ''), [p && p.name]);
  if (!ctx.myId) {
    return (
      <View style={{ flex: 1 }}>
        <Header title="Profil" />
        <LoginPrompt ctx={ctx} text="Přihlášení zabere jedno klepnutí přes Apple." />
        <View style={{ paddingHorizontal: 24, marginTop: 30 }}>
          <SettingsLinks onReplay={ctx.replayOnboarding} />
        </View>
      </View>
    );
  }
  const given = ctx.myItems.length;
  const handed = ctx.myItems.filter((x) => x.status === 'given').length;
  const got = Object.values(ctx.outgoing).filter((x) => x === 'accepted').length;
  const c = ctx.contact;
  return (
    <View style={{ flex: 1 }}>
      <Header title="Profil" />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 30 }}>
        <View style={{ alignItems: 'center' }}>
          <View style={st.bigAvatar}>
            <Text style={{ color: '#fff', fontSize: 40, fontWeight: '900' }}>{(name.trim()[0] || 'T').toUpperCase()}</Text>
          </View>
          {editing ? (
            <TextInput
              value={name}
              onChangeText={setName}
              autoFocus
              onEndEditing={() => {
                setEditing(false);
                ctx.updateName(name.trim());
              }}
              returnKeyType="done"
              placeholder="Tvoje jméno"
              placeholderTextColor="#B5B5BA"
              maxLength={40}
              style={[st.h1, { fontSize: 24, textAlign: 'center', marginTop: 12, minWidth: 200, borderBottomWidth: 2, borderBottomColor: B, paddingBottom: 2 }]}
            />
          ) : (
            <Pressable onPress={() => setEditing(true)} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12, minHeight: 44 }} accessibilityLabel="Upravit jméno">
              <Text style={[st.h1, { fontSize: 24, color: name.trim() ? INK : B }]}>{name.trim() || 'Přidej své jméno'}</Text>
              <Ionicons name="pencil" size={16} color={name.trim() ? SUB : B} style={{ marginLeft: 8 }} />
            </Pressable>
          )}
          <Text style={[st.chartAxis, { marginTop: 0 }]}>Jméno uvidí sousedé u tvých věcí</Text>
          <View style={[st.pointsPill, { marginTop: 10 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}><Ionicons name="star" size={14} color={B} /><Text style={{ fontWeight: '900', color: B, marginLeft: 5 }}>{(p && p.points) || 0} bodů dobra</Text></View>
          </View>
        </View>
        {given + handed + got === 0 ? (
          <View style={[st.chartCard, { marginTop: 20, flexDirection: 'row', alignItems: 'center' }]}>
            <Taki size={64} mood="wink" />
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={st.h2}>Tvůj první dar tě čeká</Text>
              <Text style={st.chartAxis}>Daruj věc a získej odznak První dar.</Text>
              <Pressable onPress={ctx.openAdd} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
                <Text style={{ color: B, fontWeight: '700', fontSize: 15 }}>Darovat věc</Text>
                <Ionicons name="chevron-forward" size={16} color={B} />
              </Pressable>
            </View>
          </View>
        ) : (
        <View style={{ flexDirection: 'row', marginTop: 20 }}>
          {[
            [given, 'darováno'],
            [handed, 'předáno'],
            [got, 'získáno'],
          ].map(([v, l]) => (
            <View key={l} style={st.statBox}>
              <Text style={[st.bigNum, { fontSize: 26 }]}>{v}</Text>
              <Text style={st.chartAxis}>{l}</Text>
            </View>
          ))}
        </View>
        )}

        <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <Text style={st.section}>Odznaky</Text>
          <Text style={[st.chartAxis, { fontWeight: '700' }]}>{[!!(p && p.welcome_claimed), given >= 1, handed >= 1, got >= 1].filter(Boolean).length}/4</Text>
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
          {[
            ['leaf', 'Nováček', !!(p && p.welcome_claimed)],
            ['gift', 'První dar', given >= 1],
            ['people', 'Dobrý soused', handed >= 1],
            ['search', 'Lovec pokladů', got >= 1],
          ].map(([e, l, on]) => (
            <View key={l} style={st.badgeBox}>
              <View style={[st.badgeIcon, on ? { backgroundColor: B } : { backgroundColor: '#EDEDF1' }]}>
                <Ionicons name={on ? e : 'lock-closed'} size={20} color={on ? '#fff' : '#B5B5BA'} />
              </View>
              <Text style={[st.chartAxis, { color: on ? INK : SUB, fontWeight: '700', textAlign: 'center' }]}>{l}</Text>
            </View>
          ))}
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <Text style={st.section}>O mně</Text>
          <Pressable onPress={() => setAboutOpen(true)} hitSlop={10}>
            <Text style={{ color: B, fontWeight: '700', fontSize: 15 }}>Upravit</Text>
          </Pressable>
        </View>
        <Pressable onPress={() => setAboutOpen(true)} style={st.chartCard}>
          {(p && ((p.take_reasons || []).length || p.about)) ? (
            <>
              <ReasonChips reasons={p.take_reasons} />
              {p.about ? <Text style={[st.body, { fontSize: 15, lineHeight: 21, marginTop: 8 }]}>{p.about}</Text> : null}
            </>
          ) : (
            <Text style={st.chartAxis}>Napiš, proč hledáš věci zdarma. Dárci to uvidí u tvé žádosti.</Text>
          )}
        </Pressable>
        <AboutSheet
          visible={aboutOpen}
          profile={p}
          onClose={() => setAboutOpen(false)}
          onSave={(a, r) => {
            setAboutOpen(false);
            ctx.updateAbout(a, r);
          }}
        />

        <Text style={st.section}>Kontakt pro zájemce</Text>
        <View style={st.chartCard}>
          {c && c.methods && c.methods.length ? (
            <>
              <View style={{ flexDirection: 'row', marginBottom: 6 }}>
                {CONTACTS.filter((x) => c.methods.includes(x.id)).map((x) => (
                  <View key={x.id} style={[st.miniContact, { backgroundColor: x.color }]}>
                    <Ionicons name={x.icon} size={16} color="#fff" />
                  </View>
                ))}
              </View>
              {c.phone ? <IconLine icon="call-outline" text={c.phone} /> : null}
              {c.messenger ? <IconLine icon="link-outline" text={c.messenger} style={{ marginTop: 2 }} /> : null}
              <Text style={[st.chartAxis, { marginTop: 6 }]}>Vidí ho jen zájemce, kterého potvrdíš. Předvyplní se u další věci.</Text>
            </>
          ) : (
            <Text style={st.chartAxis}>Uloží se, až přidáš první věc.</Text>
          )}
        </View>

        <Text style={st.section}>Nastavení a pomoc</Text>
        <SettingsLinks onReplay={ctx.replayOnboarding} />
        <View style={[st.chartCard, { paddingVertical: 4, marginTop: 12 }]}>
          <Pressable
            style={st.settingRow}
            onPress={() =>
              Alert.alert('Odhlásit se?', null, [
                { text: 'Zrušit', style: 'cancel' },
                { text: 'Odhlásit', onPress: ctx.signOut },
              ])
            }
          >
            <Ionicons name="log-out-outline" size={20} color={INK} />
            <Text style={[st.body, { flex: 1, marginLeft: 12 }]}>Odhlásit se</Text>
          </Pressable>
          <Pressable
            style={[st.settingRow, { borderTopWidth: 1, borderTopColor: '#E8E8ED' }]}
            onPress={() =>
              Alert.alert('Smazat účet?', 'Smažeme tvůj profil, inzeráty, žádosti i kontakty. Tohle nejde vrátit.', [
                { text: 'Zrušit', style: 'cancel' },
                { text: 'Smazat účet', style: 'destructive', onPress: ctx.deleteAccount },
              ])
            }
          >
            <Ionicons name="trash-outline" size={20} color="#FF3B30" />
            <Text style={[st.body, { flex: 1, color: '#FF3B30', marginLeft: 12 }]}>Smazat účet</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

function SettingsLinks({ onReplay }) {
  const rows = [
    ...(onReplay ? [['refresh-outline', 'Projít úvod znovu', onReplay]] : []),
    ['document-text-outline', 'Podmínky použití', () => Linking.openURL(TERMS_URL)],
    ['shield-checkmark-outline', 'Ochrana soukromí', () => Linking.openURL(PRIVACY_URL)],
    ['mail-outline', 'Napsat podpoře', () => Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=TAKE.it`).catch(() => Alert.alert('Podpora', SUPPORT_EMAIL))],
  ];
  return (
    <View style={[st.chartCard, { paddingVertical: 4 }]}>
      {rows.map(([e, l, fn], i) => (
        <Pressable key={l} onPress={fn} style={[st.settingRow, i > 0 && { borderTopWidth: 1, borderTopColor: '#E8E8ED' }]}>
          <Ionicons name={e} size={20} color={INK} />
          <Text style={[st.body, { flex: 1, marginLeft: 12 }]}>{l}</Text>
          <Ionicons name="chevron-forward" size={18} color="#C7C7CC" />
        </Pressable>
      ))}
    </View>
  );
}

// ---------- Root ----------
GiveReason.tip = 'Já jsem Taki a provedu tě. Bude to rychlé!';
GiveImpact.tip = 'Tohle se mi líbí! 💜';
GiveImpact.mood = 'excited';
GiveWhat.tip = 'Klidně vyber víc věcí najednou.';
GiveAmount.tip = 'Ať víme, jak velký úklid chystáš 🧹';
GiveAmount.mood = 'wink';
GivePickup.tip = 'Sousedé se ti přizpůsobí.';
GiveSpeed.tip = 'Vyfotit to zvládneš levou zadní.';
GiveSpeed.mood = 'wink';
NotifyGive.tip = 'Ozvu se, jen když se něco děje.';
GiftStep.tip = 'Pssst… mám pro tebe dárek!';
GiftStep.mood = 'wow';
FirstItem.tip = 'Hezká fotka = rychlejší zájemce 📸';
TakeWhy.tip = 'Upřímnost pomáhá – dárci rádi ví, komu věc dělá radost 💜';
TakeWhy.mood = 'happy';
CommunityStep.tip = 'Tohle jsou skutečná čísla, žádné výmysly 😉';
CommunityStep.mood = 'excited';
TakeCategories.tip = 'Ahoj, já jsem Taki! Pomůžu ti najít poklady.';
TakeSavings.tip = 'Zdarma je nejlepší cena 😄';
TakeSavings.mood = 'excited';
TakeCompare.tip = 'Žádné smlouvání, slibuju.';
TakeCompare.mood = 'wink';
TakeDistance.tip = 'Kam až dojdeš pěšky?';
TakeDistance.mood = 'think';
NotifyTake.tip = 'Dám vědět, když se objeví něco pro tebe.';
const GIVE_STEPS = [GiveReason, GiveImpact, GiveWhat, GiveAmount, GivePickup, NeighborsMap, GiveSpeed, CommunityStep, NotifyGive, SetupGive, GiftStep, FirstItem];
const TAKE_STEPS = [TakeCategories, TakeWhy, TakeSavings, TakeCompare, TakeDistance, CommunityStep, NotifyTake, SetupTake, GiftStep, TakeDone];

function Root() {
  const [route, setRoute] = useState('loading');
  const [tab, setTab] = useState('home');
  const [data, setData] = useState({});
  const [points, setPoints] = useState(0);
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [contact, setContact] = useState(null);
  const [loc, setLoc] = useState(null);
  const [feedRows, setFeedRows] = useState([]);
  const [myRows, setMyRows] = useState([]);
  const [incoming, setIncoming] = useState([]);
  const [outgoingList, setOutgoingList] = useState([]);
  const [loadingFeed, setLoadingFeed] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [login, setLogin] = useState(null); // { then }
  const [toast, setToast] = useState(null);
  const myId = session ? session.user.id : null;
  const dataRef = useRef(data);
  dataRef.current = data;

  // Start: přihlášení + jestli už prošel onboardingem
  useEffect(() => {
    (async () => {
      const done = await AsyncStorage.getItem('onboarded').catch(() => null);
      const { data: s } = await supabase.auth.getSession();
      setSession(s.session);
      setRoute(done ? 'main' : 'welcome');
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  // Poloha (přibližná) pro feed a nové věci
  useEffect(() => {
    if (route !== 'main' && route !== 'give' && route !== 'take') return;
    if (loc) return;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return setLoc(CENTER);
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setLoc({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
      } catch (e) {
        setLoc(CENTER);
      }
    })();
  }, [route]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const l = loc || CENTER;
      const jobs = [api.fetchFeed(l.latitude, l.longitude, 150).then(setFeedRows)];
      if (myId) {
        jobs.push(api.getProfile(myId).then(setProfile));
        jobs.push(api.getMyContact(myId).then(setContact));
        jobs.push(api.fetchMyItems(myId).then(setMyRows));
        jobs.push(api.fetchIncoming(myId).then(setIncoming));
        jobs.push(api.fetchOutgoing(myId).then(setOutgoingList));
      } else {
        setProfile(null);
        setContact(null);
        setMyRows([]);
        setIncoming([]);
        setOutgoingList([]);
      }
      await Promise.all(jobs);
    } catch (e) {
      if (!isConfigured) setToast({ title: 'Chybí napojení na server', body: 'Doplň Supabase klíče podle README.' });
      else setToast({ title: 'Nepodařilo se načíst data', body: 'Zkontroluj připojení k internetu a zkus to znovu.' });
    } finally {
      setRefreshing(false);
      setLoadingFeed(false);
    }
  }, [loc, myId]);

  useEffect(() => {
    if (route === 'main' || route === 'given') refresh();
  }, [route, myId, loc]);

  // Notifikace: klepnutí → Aktivita, příchozí → obnovit data
  useEffect(() => {
    let a;
    let b;
    try {
      a = Notifications.addNotificationResponseReceivedListener(() => {
        setRoute('main');
        setTab('activity');
      });
      b = Notifications.addNotificationReceivedListener(() => refresh());
    } catch (e) {}
    return () => {
      a && a.remove();
      b && b.remove();
    };
  }, [refresh]);

  const afterLogin = async (s) => {
    setSession(s);
    const uid = s.user.id;
    api.registerPush(uid);
    if (dataRef.current.welcomeGift) await api.claimWelcome().catch(() => {});
    let [prof, cont] = await Promise.all([api.getProfile(uid), api.getMyContact(uid)]);
    // „O mně“ z úvodu uložíme do profilu (jen když tam ještě nic není)
    const d = dataRef.current;
    if (prof && !(prof.take_reasons || []).length && !prof.about && ((d.takeReasons || []).length || d.about)) {
      await api.updateAbout(uid, d.about || '', d.takeReasons || []).catch(() => {});
      prof = { ...prof, about: d.about || '', take_reasons: d.takeReasons || [] };
    }
    setProfile(prof);
    setContact(cont);
    return uid;
  };

  const run = async (fn, okToast) => {
    try {
      await fn();
      if (okToast) setToast(okToast);
      await refresh();
    } catch (e) {
      Alert.alert('Něco se nepovedlo', String((e && e.message) || e));
    }
  };

  const outgoing = {};
  outgoingList.forEach((r) => {
    if (r.item) outgoing[r.item.id] = r.status;
  });

  const ctx = {
    data,
    set: (k, v) => setData((d) => ({ ...d, [k]: v })),
    points,
    addPoints: (n) => setPoints((x) => x + n),
    myId,
    profile,
    contact,
    loc,
    feed: feedRows.map((r) => mapItem(r, myId)),
    myItems: myRows.map((r) => mapItem(r, myId)),
    incoming,
    outgoing,
    outgoingList,
    loadingFeed,
    refreshing,
    refresh,
    tab,
    setTab,
    addOpen,
    openAdd: () => (myId ? setAddOpen(true) : setLogin({ then: () => setAddOpen(true) })),
    closeAdd: () => setAddOpen(false),
    openInbox: () => {
      setRoute('main');
      setTab('activity');
    },
    requireLogin: (fn) => {
      if (myId) return fn(myId);
      setLogin({ then: fn });
    },
    requestItem: (item, msg, uid) =>
      run(() => api.requestItem(uid || myId, item.id, msg), { title: 'Žádost odeslána', body: 'Dáme ti vědět, jakmile dárce odpoví.' }),
    accept: (id) => run(() => api.acceptRequest(id), { title: 'Potvrzeno', body: 'Zájemce dostal upozornění a tvůj kontakt. Po předání věc označ jako předanou.' }),
    decline: (id) => run(() => api.declineRequest(id)),
    markGiven: async (id) => {
      await run(() => api.markGiven(id), { title: 'Předáno · +100 bodů', body: 'Díky, že posíláš věci dál.' });
      // Hodnocení v App Store – systémové okno Apple, jen jednou a po dobrém zážitku
      try {
        const asked = await AsyncStorage.getItem('review_asked');
        if (!asked && (await StoreReview.isAvailableAsync())) {
          await AsyncStorage.setItem('review_asked', '1');
          setTimeout(() => StoreReview.requestReview().catch(() => {}), 1500);
        }
      } catch (e) {}
    },
    deleteItem: (id) => run(() => api.deleteItem(id)),
    report: (item, reason) =>
      ctx.requireLogin((uid) => run(() => api.reportItem(uid, item.id, reason), { title: 'Díky za nahlášení', body: 'Podíváme se na to. Po více nahlášeních se inzerát skryje automaticky.' })),
    block: (otherId) =>
      ctx.requireLogin((uid) => run(() => api.blockUser(uid, otherId), { title: 'Uživatel zablokován', body: 'Jeho věci už neuvidíš a on neuvidí tvoje.' })),
    updateName: (name) => myId && run(() => api.updateName(myId, name)),
    updateAbout: (about, reasons) => myId && run(() => api.updateAbout(myId, about, reasons), { title: 'Uloženo', body: 'Dárci uvidí tvoje „O mně“ u žádostí.' }),
    signOut: () => run(() => api.signOut()),
    replayOnboarding: async () => {
      await AsyncStorage.removeItem('onboarded').catch(() => {});
      setData({});
      setPoints(0);
      setTab('home');
      setRoute('welcome');
    },
    deleteAccount: () => run(() => api.deleteAccount(), { title: 'Účet smazán', body: 'Mrzí nás, že odcházíš. Kdykoli se můžeš vrátit.' }),
  };

  const finishOnboarding = async (dest, t) => {
    await AsyncStorage.setItem('onboarded', '1').catch(() => {});
    setTab(t || 'home');
    setRoute(dest);
  };

  let screen;
  if (route === 'loading')
    screen = (
      <View style={{ flex: 1, backgroundColor: B, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#fff" />
      </View>
    );
  else if (route === 'welcome') screen = <Welcome onStart={() => setRoute('intro')} />;
  else if (route === 'intro') screen = <Intro onPick={setRoute} />;
  else if (route === 'give')
    screen = <Flow key="give" steps={GIVE_STEPS} ctx={ctx} onExit={() => setRoute('intro')} onFinish={() => finishOnboarding('given', 'mine')} />;
  else if (route === 'given') screen = <Given ctx={ctx} onContinue={() => finishOnboarding('main', 'mine')} />;
  else if (route === 'take') screen = <Flow key="take" steps={TAKE_STEPS} ctx={ctx} onExit={() => setRoute('intro')} onFinish={() => finishOnboarding('main', 'home')} />;
  else screen = <MainApp ctx={ctx} />;

  return (
    <View style={{ flex: 1 }}>
      <StatusBar barStyle="dark-content" />
      {screen}
      <AddItemModal ctx={ctx} />
      <LoginSheet
        visible={!!login}
        onClose={() => setLogin(null)}
        onSuccess={async (s) => {
          const pending = login;
          setLogin(null);
          const uid = await afterLogin(s);
          if (pending && pending.then) setTimeout(() => pending.then(uid), 400);
        }}
      />
      <Toast toast={toast} onHide={() => setToast(null)} onPress={() => setToast(null)} />
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <Root />
    </SafeAreaProvider>
  );
}


// ---------- Styly ----------
const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 6, paddingBottom: 14 },
  backBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  backTxt: { fontSize: 34, lineHeight: 36, color: INK, fontWeight: '300' },
  track: { flex: 1, height: 8, borderRadius: 4, backgroundColor: '#ECECF0', overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4, backgroundColor: B },
  h1: { fontSize: 34, lineHeight: 40, fontWeight: '800', color: INK, letterSpacing: -0.5 },
  h2: { fontSize: 18, fontWeight: '700', color: INK },
  sub: { fontSize: 17, lineHeight: 23, color: SUB, marginTop: 8 },
  secondary: { textAlign: 'center', color: SUB, fontSize: 17, fontWeight: '600', marginBottom: 18 },
  btn: { height: 60, borderRadius: 30, backgroundColor: B, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  btnLight: { backgroundColor: B_LIGHT },
  btnDis: { backgroundColor: '#D4D4D8' },
  btnTxt: { color: '#fff', fontSize: 19, fontWeight: '700' },
  option: {
    backgroundColor: '#fff',
    borderRadius: 22,
    paddingVertical: 22,
    paddingHorizontal: 18,
    marginBottom: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  optionSel: { borderColor: B, backgroundColor: B_LIGHT },
  optionTxt: { fontSize: 18, fontWeight: '600', color: INK },
  bar: { width: 92, borderRadius: 22 },
  barLabelBox: { width: 136, alignItems: 'center' },
  barValue: { fontSize: 24, fontWeight: '800', color: INK },
  barLabel: { fontSize: 15, color: SUB, marginTop: 4 },
  chartCard: { backgroundColor: CARD, borderRadius: 24, padding: 18 },
  chartL: { fontSize: 17, fontWeight: '700', color: INK },
  chartAxis: { fontSize: 14, color: SUB, marginTop: 4 },
  bigNum: { fontSize: 56, fontWeight: '900', color: B, letterSpacing: -1 },
  thumb: {
    position: 'absolute',
    marginLeft: -18,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: B,
    borderWidth: 4,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  phone: {
    width: W * 0.62,
    height: 150,
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    borderWidth: 6,
    borderBottomWidth: 0,
    borderColor: '#1C1C1E',
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
    paddingTop: 12,
  },
  island: { width: 80, height: 22, borderRadius: 11, backgroundColor: '#000' },
  lockDate: { color: SUB, fontWeight: '600', marginTop: 10 },
  lockTime: { fontSize: 46, fontWeight: '300', color: INK },
  notif: {
    flexDirection: 'row',
    alignItems: 'center',
    width: W - 48,
    marginTop: -26,
    backgroundColor: '#fff',
    borderRadius: 22,
    padding: 14,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  check: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#E5E5EA', alignItems: 'center', justifyContent: 'center' },
  photoBox: {
    marginTop: 22,
    minHeight: 150,
    borderRadius: 24,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#D4D4D8',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
  },
  photoThumb: { width: 110, height: 110, borderRadius: 16, marginRight: 10 },
  bubble: { backgroundColor: '#FFFFFF', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10, shadowColor: '#2A0B66', shadowOpacity: 0.1, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 4, borderWidth: 1, borderColor: '#EFE8FF' },
  bubbleTail: { position: 'absolute', left: -6, top: '50%', marginTop: -6, width: 12, height: 12, backgroundColor: '#FFFFFF', transform: [{ rotate: '45deg' }], borderLeftWidth: 1, borderBottomWidth: 1, borderColor: '#EFE8FF' },
  bubbleTxt: { fontSize: 15, fontWeight: '600', color: INK, lineHeight: 20 },
  guideRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, marginTop: -4, marginBottom: 4 },
  blob: { position: 'absolute', width: 300, height: 300, borderRadius: 150, backgroundColor: '#F1EBFF', opacity: 0.8 },
  label: { fontSize: 15, fontWeight: '800', color: INK, marginTop: 16, marginBottom: 8 },
  inputSm: { paddingVertical: 12, fontSize: 16, marginTop: 10 },
  addPhoto: { width: 78, height: 78, borderRadius: 16, borderWidth: 2, borderStyle: 'dashed', borderColor: '#D4D4D8', alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  smallThumb: { width: 78, height: 78, borderRadius: 16, marginRight: 8 },
  coverTag: { position: 'absolute', left: 6, bottom: 6, backgroundColor: B, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  chipSm: { paddingVertical: 9, paddingHorizontal: 11, borderRadius: 18, backgroundColor: CARD, marginRight: 6 },
  chipSmTxt: { fontSize: 13, fontWeight: '700', color: INK },
  contactCircle: { width: 58, height: 58, borderRadius: 29, borderWidth: 2, borderColor: '#ECECF0', backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: CARD, borderRadius: 16, paddingHorizontal: 14, minHeight: 46 },
  filterBtn: { width: 46, height: 46, borderRadius: 16, backgroundColor: CARD, alignItems: 'center', justifyContent: 'center', marginLeft: 10 },
  quickChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16, backgroundColor: CARD, marginRight: 8 },
  quickChipOn: { backgroundColor: B },
  quickTxt: { fontWeight: '700', color: INK, fontSize: 14 },
  dots: { position: 'absolute', bottom: 14, alignSelf: 'center', flexDirection: 'row' },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.6)', marginHorizontal: 3 },
  dotOn: { width: 20, backgroundColor: '#fff' },
  photoCount: { position: 'absolute', bottom: 12, right: 14, backgroundColor: 'rgba(0,0,0,0.35)', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  detailTopBar: { position: 'absolute', top: 16, left: 16, right: 16, flexDirection: 'row', justifyContent: 'space-between' },
  roundBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.92)', alignItems: 'center', justifyContent: 'center' },
  metaChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: CARD, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6, marginRight: 8, marginBottom: 8 },
  metaTxt: { fontWeight: '700', color: INK, fontSize: 13 },
  donorCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: CARD, borderRadius: 20, padding: 14, marginTop: 14 },
  verified: { backgroundColor: B_LIGHT, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4 },
  miniMap: { height: 150, borderRadius: 20, overflow: 'hidden' },
  notice: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: B_LIGHT, borderRadius: 18, padding: 14, marginBottom: 14 },
  noticeTitle: { fontSize: 16, fontWeight: '700', color: INK },
  noticeTxt: { fontSize: 14, lineHeight: 19, color: SUB, marginTop: 2 },
  reasonChip: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 13, borderRadius: 16, backgroundColor: CARD, marginRight: 8, marginBottom: 8, borderWidth: 2, borderColor: CARD },
  reasonChipOn: { backgroundColor: B_LIGHT, borderColor: B },
  reasonTxt: { fontSize: 15, fontWeight: '600', color: INK, marginLeft: 7 },
  reasonTag: { flexDirection: 'row', alignItems: 'center', backgroundColor: B_LIGHT, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4, marginRight: 6, marginBottom: 6 },
  reasonTagTxt: { fontSize: 12.5, fontWeight: '700', color: B, marginLeft: 4 },
  aboutInput: { minHeight: 96, backgroundColor: CARD, borderRadius: 16, padding: 14, paddingTop: 14, fontSize: 16, lineHeight: 22, color: INK, textAlignVertical: 'top' },
  aboutQuote: { marginTop: 6, borderLeftWidth: 3, borderLeftColor: B_LIGHT, paddingLeft: 10 },
  stickyFooter: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 30, borderTopWidth: 1, borderTopColor: '#EFEFF2', backgroundColor: '#fff' },
  optCheck: { position: 'absolute', right: 16, top: '50%', marginTop: 1, width: 22, height: 22, borderRadius: 11, backgroundColor: B, alignItems: 'center', justifyContent: 'center' },
  pointsPill: { backgroundColor: B_LIGHT, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 5 },
  floatCard: { position: 'absolute', width: 126, backgroundColor: '#fff', borderRadius: 18, padding: 8, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 6 },
  rewardRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: CARD, borderRadius: 20, padding: 14, marginBottom: 12 },
  rewardIcon: { width: 54, height: 54, borderRadius: 16, backgroundColor: B_LIGHT, alignItems: 'center', justifyContent: 'center' },
  badgeBox: { width: (W - 48 - 24) / 4, backgroundColor: CARD, borderRadius: 16, paddingVertical: 12, alignItems: 'center', marginBottom: 8 },
  badgeIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  miniContact: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  mapPin: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#fff', borderWidth: 3, borderColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 5 },
  mapPinTip: { width: 0, height: 0, borderLeftWidth: 6, borderRightWidth: 6, borderTopWidth: 8, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: '#fff', marginTop: -1 },
  meDot: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#0A84FF', borderWidth: 4, borderColor: '#fff', shadowColor: '#0A84FF', shadowOpacity: 0.5, shadowRadius: 8, elevation: 4 },
  mapCard: { position: 'absolute', left: 16, right: 16, bottom: 16, backgroundColor: '#fff', borderRadius: 22, padding: 12, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 10 },
  mapHint: { position: 'absolute', alignSelf: 'center', bottom: 18, backgroundColor: '#fff', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 9, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 10, elevation: 6 },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: -6 },
    elevation: 16,
  },
  sheetHandle: { alignSelf: 'center', width: 44, height: 5, borderRadius: 3, backgroundColor: '#E0E0E5', marginBottom: 14 },
  liveRow: { flexDirection: 'row', alignItems: 'center', alignSelf: 'center', backgroundColor: CARD, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 7 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: GREEN, marginRight: 8 },
  marqueeChip: { width: 54, height: 54, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  plusCard: { borderRadius: 24, padding: 20 },
  plusStat: { backgroundColor: 'rgba(255,255,255,0.16)', borderRadius: 16, padding: 14, marginTop: 16 },
  perkLine: { position: 'absolute', left: 45, right: 45, top: 24, height: 4, borderRadius: 2, backgroundColor: '#E5E5EA' },
  perkDot: { width: 52, height: 52, borderRadius: 26, borderWidth: 3, borderColor: '#E5E5EA', backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  discountPill: { backgroundColor: B, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 8 },
  segment: { flexDirection: 'row', backgroundColor: CARD, borderRadius: 14, padding: 4, marginBottom: 16 },
  segBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  segBtnOn: { backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  segTxt: { fontSize: 14, fontWeight: '700', color: SUB },
  bigAvatar: { width: 96, height: 96, borderRadius: 48, backgroundColor: B, alignItems: 'center', justifyContent: 'center' },
  statBox: { flex: 1, alignItems: 'center', backgroundColor: CARD, borderRadius: 18, paddingVertical: 14, marginHorizontal: 4 },
  settingRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14 },
  tabBar: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#EFEFF2', paddingTop: 8, paddingBottom: 4, backgroundColor: '#fff' },
  tabBtn: { flex: 1, alignItems: 'center' },
  tabTxt: { fontSize: 11, fontWeight: '700', color: SUB, marginTop: 2 },
  tabAdd: { width: 46, height: 46, borderRadius: 23, backgroundColor: B, alignItems: 'center', justifyContent: 'center', marginHorizontal: 10 },
  statusCard: { backgroundColor: B_LIGHT, borderRadius: 20, padding: 18, alignItems: 'center' },
  inboxHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingTop: 20, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#EFEFF2' },
  reqCard: { backgroundColor: CARD, borderRadius: 20, padding: 16, marginBottom: 12 },
  avatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: B_LIGHT, alignItems: 'center', justifyContent: 'center' },
  bellBadge: { position: 'absolute', top: -4, right: -8, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: '#FF3B30', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  toast: {
    position: 'absolute',
    left: 12,
    right: 12,
    backgroundColor: '#fff',
    borderRadius: 22,
    padding: 14,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  section: { fontSize: 20, fontWeight: '700', color: INK, marginTop: 28, marginBottom: 8, letterSpacing: -0.2 },
  body: { fontSize: 17, lineHeight: 24, color: INK },
  inputErr: { borderWidth: 2, borderColor: '#FF3B30' },
  contactTile: {
    width: (W - 48 - 20) / 3,
    marginRight: 10,
    marginBottom: 10,
    paddingVertical: 14,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#ECECF0',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  contactTxt: { fontSize: 13, fontWeight: '700', color: SUB, marginTop: 6 },
  contactCheck: { position: 'absolute', top: 6, right: 6, width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  contactBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 56, borderRadius: 28, marginTop: 10 },
  contactBtnTxt: { color: '#fff', fontSize: 17, fontWeight: '800', marginLeft: 10 },
  closeBtn: { position: 'absolute', top: 16, right: 16, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.9)', alignItems: 'center', justifyContent: 'center' },
  input: { backgroundColor: CARD, borderRadius: 18, padding: 16, fontSize: 17, color: INK, marginTop: 12 },
  chip: { paddingVertical: 11, paddingHorizontal: 15, borderRadius: 22, backgroundColor: CARD, marginRight: 8, marginTop: 8 },
  chipSel: { backgroundColor: B },
  chipTxt: { fontSize: 15, fontWeight: '700', color: INK },
  pin: { backgroundColor: B, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14, borderWidth: 3, borderColor: '#fff' },
  pinTxt: { color: '#fff', fontWeight: '900', fontStyle: 'italic', fontSize: 12 },
  catChip: { paddingVertical: 14, paddingHorizontal: 16, borderRadius: 18, backgroundColor: CARD, marginRight: 10, marginBottom: 10, borderWidth: 2, borderColor: 'transparent' },
  catChipSel: { backgroundColor: B_LIGHT, borderColor: B },
  catTxt: { fontSize: 16, fontWeight: '600', color: INK },
  saveRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  strike: { color: SUB, textDecorationLine: 'line-through', fontSize: 15, marginRight: 10 },
  zero: { color: B, fontWeight: '800', fontSize: 17 },
  hTrack: { height: 18, borderRadius: 9, backgroundColor: '#E5E5EA', marginTop: 8, overflow: 'hidden' },
  hBar: { height: '100%', borderRadius: 9 },
  itemCard: { backgroundColor: '#fff', borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: '#EFEFF2' },
  freeBadge: { position: 'absolute', top: 10, left: 10, backgroundColor: '#fff', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  freeBadgeTxt: { color: GREEN, fontWeight: '900', fontSize: 12 },
  itemTitle: { fontSize: 16, fontWeight: '700', color: INK },
  itemMeta: { fontSize: 13, color: SUB, marginTop: 3 },
  lockCard: {
    position: 'absolute',
    left: 40,
    right: 40,
    top: '30%',
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 22,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  plan: { flexDirection: 'row', alignItems: 'center', borderRadius: 20, borderWidth: 2, borderColor: '#E5E5EA', padding: 16, marginBottom: 10 },
  planSel: { borderColor: B, backgroundColor: B_LIGHT },
  radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#C7C7CC', alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: B },
  planBadge: { position: 'absolute', top: -11, right: 16, backgroundColor: B, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 3 },
  planBadgeTxt: { color: '#fff', fontSize: 12, fontWeight: '800' },
  feedHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 12 },
  fab: {
    position: 'absolute',
    bottom: 34,
    alignSelf: 'center',
    backgroundColor: B,
    paddingHorizontal: 26,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    shadowColor: B,
    shadowOpacity: 0.4,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
});

