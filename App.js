// TAKE.IT – Pošli to dál.
// Demo appka pro Expo Go / Expo Snack (jeden soubor).
import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
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
} from 'react-native';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';

// Mapa jen na telefonu (na webu by react-native-maps spadla)
let MapView = null;
let Marker = null;
let MapCircle = null;
if (Platform.OS !== 'web') {
  try {
    const maps = require('react-native-maps');
    MapView = maps.default;
    Marker = maps.Marker;
    MapCircle = maps.Circle;
  } catch (e) {}
}

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
const success = () => {
  try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}); } catch (e) {}
};
const kc = (n) => n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

// ---------- Data ----------
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
const photo = (id, extra = '') => `https://images.unsplash.com/${id}?w=700&q=70&auto=format&fit=crop${extra}`;
const ITEMS_RAW = [
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
];

const VALUES = { Pohovka: 3000, 'Dětské kolo': 1200, 'Monitor 24"': 1500, Kávovar: 800, Monstera: 400, 'Stolní lampa': 300, 'Krabice knih': 500, 'Zimní bunda': 900, Plyšáci: 300, 'Jídelní židle': 600, Sluchátka: 700, 'Sada hrnků': 200 };
const CENTER = { latitude: 50.083, longitude: 14.43 };
const DONORS = [
  { n: 'Petra', e: '👩‍🦰', r: '4,9', c: 12, resp: 'do 1 h' },
  { n: 'Tomáš', e: '🧔', r: '5,0', c: 4, resp: 'do 30 min' },
  { n: 'Lucie', e: '👩', r: '4,8', c: 21, resp: 'do 2 h' },
  { n: 'Martin', e: '👨', r: '4,7', c: 7, resp: 'během dne' },
];
const ITEM_CATS = { Pohovka: 'Nábytek', 'Dětské kolo': 'Sport', 'Monitor 24"': 'Elektronika', Kávovar: 'Domácnost', Monstera: 'Zahrada', 'Stolní lampa': 'Domácnost', 'Krabice knih': 'Knihy', 'Zimní bunda': 'Oblečení', Plyšáci: 'Pro děti', 'Jídelní židle': 'Nábytek', Sluchátka: 'Elektronika', 'Sada hrnků': 'Domácnost' };
const ITEMS = ITEMS_RAW.map((it, i) => ({ ...it, img: PHOTO_IDS[it.t] ? photo(PHOTO_IDS[it.t]) : null, img2: PHOTO_IDS[it.t] ? photo(PHOTO_IDS[it.t], '&crop=focalpoint&fp-x=0.5&fp-y=0.5&fp-z=1.8') : null, cat: ITEM_CATS[it.t], donor: DONORS[i % DONORS.length], lat: CENTER.latitude + (((i * 37) % 11) - 5) * 0.0045, lng: CENTER.longitude + (((i * 53) % 13) - 6) * 0.006, v: VALUES[it.t] || 500, demo: true, contact: DEMO_CONTACT, d: 'Ve velmi dobrém stavu, vyzvednutí po domluvě.', chip: 'U dveří' }));

const CATEGORIES = [
  ['🛋️', 'Nábytek'], ['📱', 'Elektronika'], ['👕', 'Oblečení'], ['🧸', 'Pro děti'],
  ['📚', 'Knihy'], ['⚽', 'Sport'], ['🍳', 'Domácnost'], ['🪴', 'Zahrada'],
  ['🐾', 'Zvířata'], ['🎨', 'Hobby'],
];

const PINS = [
  { latitude: 50.0875, longitude: 14.4213 },
  { latitude: 50.0755, longitude: 14.4378 },
  { latitude: 50.1035, longitude: 14.4505 },
  { latitude: 50.0645, longitude: 14.4075 },
  { latitude: 50.0828, longitude: 14.4638 },
  { latitude: 50.0965, longitude: 14.3955 },
];

const CONTACTS = [
  { id: 'whatsapp', label: 'WhatsApp', e: '💬', color: '#25D366', field: 'phone' },
  { id: 'sms', label: 'SMS', e: '✉️', color: '#FF9500', field: 'phone' },
  { id: 'messenger', label: 'Messenger', e: '⚡', color: '#0084FF', field: 'messenger' },
  { id: 'phone', label: 'Zavolat', e: '📞', color: '#34C759', field: 'phone' },
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

const DEMO_CONTACT = { methods: ['whatsapp', 'sms', 'phone'], phone: '', messenger: '' };

function openContact(method, item) {
  const c = item.contact || {};
  if (item.demo) {
    Alert.alert('Ukázkový inzerát', 'Tohle je jen ukázka – kontakt není skutečný. Přidej vlastní věc a vyzkoušej si to na ní.');
    return;
  }
  const msg = `Ahoj, mám zájem o „${item.t}“ z TAKE.IT. Je to ještě k dispozici? 🙂`;
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

// ---------- Sleva pro dárce ----------
const TIERS = [
  { n: 1, pct: 20 },
  { n: 3, pct: 40 },
  { n: 5, pct: 60 },
];
const discountFor = (n) => TIERS.reduce((d, t) => (n >= t.n ? t.pct : d), 0);
const nextTier = (n) => TIERS.find((t) => n < t.n);
const discInfo = (ctx) => {
  const donor = discountFor(ctx.myItems.length);
  const welcome = ctx.data.welcomeGift ? 20 : 0;
  return donor >= welcome ? { pct: donor, label: 'jako dárce' } : { pct: welcome, label: 'uvítací dárek' };
};

// ---------- UI základ ----------
function Logo({ size = 40, color = B }) {
  return (
    <Text
      style={{
        fontSize: size,
        fontWeight: '900',
        fontStyle: 'italic',
        color,
        letterSpacing: -1,
        transform: [{ skewY: '-6deg' }],
      }}
    >
      TAKE.IT
    </Text>
  );
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
        tap();
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
            tap();
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
    Animated.stagger(
      12,
      parts.map((p) => Animated.timing(p.a, { toValue: 1, duration: 1500, easing: Easing.out(Easing.quad), useNativeDriver: true }))
    ).start();
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
    Animated.timing(fly, { toValue: 1, duration: 900, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
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
    let p = (pageX - x) / w;
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
      <View style={{ height: 10, borderRadius: 5, backgroundColor: '#ECECF0' }}>
        <View style={{ width: `${pct}%`, height: 10, borderRadius: 5, backgroundColor: B }} />
      </View>
      <View pointerEvents="none" style={[st.thumb, { left: `${pct}%` }]} />
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
          <Text style={st.itemMeta}>{item.km} km • před {item.m} min</Text>
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
    i < steps.length - 1 ? setI(i + 1) : onFinish();
  };
  const back = () => (i > 0 ? setI(i - 1) : onExit());
  const Step = steps[i];
  return (
    <SafeAreaView style={st.safe} edges={['top', 'bottom']}>
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
      <View style={{ height: 360 }}>
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
        <FadeIn delay={500} style={{ alignItems: 'center' }}>
          <Logo size={44} />
          <Text style={[st.h1, { textAlign: 'center', marginTop: 18, fontSize: 30 }]}>Věci zdarma od sousedů</Text>
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
      <View style={{ flex: 1, paddingHorizontal: 24 }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Animated.View
            style={{ transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.05] }) }] }}
          >
            <AppIcon size={124} />
          </Animated.View>
          <FadeIn delay={150} style={{ alignItems: 'center', marginTop: 36 }}>
            <Text style={[st.h1, { textAlign: 'center' }]}>Co tě přivádí do TAKE.IT?</Text>
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
      title="Ušetři až 2 000 Kč za odvoz"
      subtitle="Tolik si firmy běžně řeknou za odvoz jedné sedačky."
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
            <Text style={st.barValue}>1–2 tis. Kč</Text>
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
    Animated.sequence([
      Animated.delay(500),
      Animated.stagger(220, anims.map((a) => Animated.timing(a, { toValue: 1, duration: 600, easing: Easing.in(Easing.cubic), useNativeDriver: true }))),
      Animated.spring(sparkle, { toValue: 1, friction: 5, useNativeDriver: true }),
    ]).start(() => success());
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

function NeighborsMap({ next }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    const ts = PINS.map((_, i) =>
      setTimeout(() => {
        setN(i + 1);
        tap();
      }, 600 + i * 450)
    );
    return () => ts.forEach(clearTimeout);
  }, []);
  return (
    <View style={{ flex: 1 }}>
      {MapView ? (
        <MapView
          style={StyleSheet.absoluteFill}
          initialRegion={{ latitude: 50.083, longitude: 14.43, latitudeDelta: 0.07, longitudeDelta: 0.07 }}
          scrollEnabled={false}
          zoomEnabled={false}
        >
          {PINS.slice(0, n).map((p, i) => (
            <Marker key={i} coordinate={p}>
              <PopIn>
                <PinBubble />
              </PopIn>
            </Marker>
          ))}
        </MapView>
      ) : (
        <LinearGradient colors={['#EEF6E8', '#DCEFD3']} style={StyleSheet.absoluteFill}>
          {PINS.slice(0, n).map((p, i) => (
            <View key={i} style={{ position: 'absolute', left: 30 + ((i * 97) % (W - 140)), top: 180 + i * 70 }}>
              <PopIn>
                <PinBubble />
              </PopIn>
            </View>
          ))}
        </LinearGradient>
      )}
      <LinearGradient
        colors={['rgba(255,255,255,0.95)', 'rgba(255,255,255,0)']}
        style={{ paddingHorizontal: 24, paddingBottom: 60 }}
        pointerEvents="none"
      >
        <FadeIn>
          <Text style={st.h1}>Sousedé v Praze chtějí věci zdarma</Text>
          <Text style={[st.sub, { color: INK }]}>{n ? `${n} ${n === 1 ? 'zájemce' : n < 5 ? 'zájemci' : 'zájemců'} v okolí 👀` : 'Hledáme kolem tebe…'}</Text>
        </FadeIn>
      </LinearGradient>
      <View style={{ position: 'absolute', left: 24, right: 24, bottom: 0 }}>
        <Button title="Pokračovat" onPress={next} />
      </View>
    </View>
  );
}

function GiveSpeed({ next }) {
  const a = useRef(new Animated.Value(0)).current;
  const b = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.stagger(350, [
      Animated.timing(a, { toValue: 1, duration: 900, easing: Easing.out(Easing.cubic), useNativeDriver: false }),
      Animated.timing(b, { toValue: 1, duration: 600, easing: Easing.out(Easing.cubic), useNativeDriver: false }),
    ]).start(() => success());
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
    Animated.timing(a, { toValue: 100, duration: 4200, easing: Easing.inOut(Easing.quad), useNativeDriver: false }).start(() => {
      success();
      setTimeout(next, 500);
    });
    Animated.loop(
      Animated.sequence([
        Animated.timing(bounce, { toValue: 1, duration: 600, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(bounce, { toValue: 0, duration: 600, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])
    ).start();
    return () => a.removeListener(id);
  }, []);
  const per = 100 / items.length;
  const doneCount = Math.floor(p / per);
  return (
    <View style={{ flex: 1, paddingHorizontal: 24, justifyContent: 'center' }}>
      <Animated.Text
        style={{
          fontSize: 84,
          textAlign: 'center',
          transform: [{ translateY: bounce.interpolate({ inputRange: [0, 1], outputRange: [0, -14] }) }],
        }}
      >
        {emoji}
      </Animated.Text>
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

function FirstItem({ next, ctx, title: heading = 'Daruj svou první věc', hideSkip }) {
  const saved = ctx.data.savedContact || {};
  const [photos, setPhotos] = useState([]);
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [chip, setChip] = useState('U dveří');
  const [methods, setMethods] = useState((saved.methods || ['whatsapp']).filter((m) => CONTACTS.some((c) => c.id === m)));
  const [phone, setPhone] = useState(saved.phone || '+420 ');
  const [messenger, setMessenger] = useState(saved.messenger || '');
  const pick = async () => {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        selectionLimit: 5,
        quality: 0.7,
      });
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
  const valid = title.trim() && methods.length > 0 && phoneOk && messengerOk;
  const chips = [['🚪', 'U dveří'], ['🕒', 'Kdykoli dnes'], ['📦', 'Před domem']];
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 12 }} keyboardShouldPersistTaps="handled">
        <FadeIn>
          <Text style={[st.h1, { fontSize: 28, lineHeight: 34 }]}>{heading}</Text>
        </FadeIn>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 14 }}>
          <Pressable onPress={pick} style={st.addPhoto}>
            <Text style={{ fontSize: 26 }}>📷</Text>
            <Text style={{ fontSize: 12, fontWeight: '700', color: SUB, marginTop: 2 }}>{photos.length ? `${photos.length}/5` : 'Přidat'}</Text>
          </Pressable>
          {photos.map((u, k) => (
            <View key={u}>
              <Image source={{ uri: u }} style={st.smallThumb} />
              {k === 0 ? (
                <View style={st.coverTag}>
                  <Text style={{ color: '#fff', fontSize: 10, fontWeight: '800' }}>Titulní</Text>
                </View>
              ) : null}
            </View>
          ))}
        </ScrollView>

        <TextInput value={title} onChangeText={setTitle} placeholder="Co daruješ?" placeholderTextColor="#B5B5BA" style={[st.input, st.inputSm]} />
        <TextInput
          value={desc}
          onChangeText={setDesc}
          placeholder="Stav, velikost, poznámka…"
          placeholderTextColor="#B5B5BA"
          style={[st.input, st.inputSm, { height: 64, textAlignVertical: 'top' }]}
          multiline
        />

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
              <Text style={[st.chipSmTxt, chip === l && { color: '#fff' }]} numberOfLines={1}>{e} {l}</Text>
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
                  <Text style={{ fontSize: 24 }}>{c.e}</Text>
                </View>
                <Text style={[st.contactTxt, { marginTop: 4 }, on && { color: INK }]}>{c.label}</Text>
              </Pressable>
            );
          })}
        </View>
        {needPhone ? (
          <TextInput
            value={phone}
            onChangeText={setPhone}
            placeholder="Telefonní číslo"
            placeholderTextColor="#B5B5BA"
            keyboardType="phone-pad"
            style={[st.input, st.inputSm, !phoneOk && phone.length > 5 && st.inputErr]}
          />
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
        <Text style={[st.chartAxis, { marginTop: 8, fontSize: 12 }]}>🔒 Kontakt uvidí jen ten, koho potvrdíš.</Text>
      </ScrollView>
      <View style={{ paddingHorizontal: 24, paddingTop: 6 }}>
        {hideSkip ? null : (
          <Pressable onPress={next} hitSlop={10}>
            <Text style={[st.secondary, { marginBottom: 12, fontSize: 15 }]}>Udělám to později</Text>
          </Pressable>
        )}
        <Button
          title="Zveřejnit"
          disabled={!valid}
          onPress={() => {
            const contact = { methods, phone: phone.trim(), messenger: messenger.trim() };
            ctx.set('savedContact', contact);
            ctx.addItem({
              t: title.trim(),
              d: desc.trim(),
              uri: photos[0],
              photos,
              chip,
              e: '🎁',
              km: '0',
              m: 0,
              g: [B_LIGHT, '#DCCFFF'],
              contact,
            });
            success();
            next();
          }}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

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

function ItemDetail({ item, onClose, ctx }) {
  const [asking, setAsking] = useState(false);
  const [msg, setMsg] = useState('Ahoj, můžu si to vyzvednout dnes večer?');
  const heart = useRef(new Animated.Value(1)).current;
  useEffect(() => setAsking(false), [item && (item.id || item.t)]);
  if (!item) return null;
  const own = !item.demo;
  const status = ctx.outReq[item.t];
  const methods = (item.contact && item.contact.methods) || [];
  const incoming = ctx.requests.filter((r) => r.itemId === item.id);
  const pending = incoming.filter((r) => r.status === 'pending').length;
  const favs = ctx.data.favs || [];
  const fav = favs.includes(item.t);
  const donor = own ? { n: ctx.data.name || 'Ty', e: '🙂', r: '–', c: ctx.myItems.length, resp: '' } : item.donor || DONORS[0];
  const lat = item.lat || 50.08;
  const lng = item.lng || 14.43;
  const toggleFav = () => {
    tap();
    heart.setValue(1.4);
    Animated.spring(heart, { toValue: 1, friction: 3, useNativeDriver: true }).start();
    ctx.set('favs', fav ? favs.filter((x) => x !== item.t) : [...favs, item.t]);
  };
  const share = () => Share.share({ message: `Na TAKE.IT je zdarma „${item.t}“ 🎁 Kousek ode mě v Praze – mrkni do appky!` }).catch(() => {});

  let footer = null;
  if (own) {
    footer = item.status === 'reserved' ? (
      <Button title="Označit jako předané ✅" style={{ marginBottom: 0 }} onPress={() => { ctx.markGiven(item.id); onClose(); }} />
    ) : pending ? (
      <Button title={`Zobrazit zájemce (${pending})`} style={{ marginBottom: 0 }} onPress={() => { onClose(); ctx.openInbox(); }} />
    ) : null;
  } else if (status === 'accepted') {
    footer = (
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
        {CONTACTS.filter((c) => methods.includes(c.id)).map((c) => (
          <Pressable
            key={c.id}
            onPress={() => {
              tap();
              openContact(c.id, item);
            }}
            style={({ pressed }) => [st.contactBtn, { backgroundColor: c.color, flex: 1, marginHorizontal: 4, marginTop: 0 }, pressed && { opacity: 0.85 }]}
          >
            <Text style={{ fontSize: 18 }}>{c.e}</Text>
            <Text style={[st.contactBtnTxt, { fontSize: 15 }]}>{c.label}</Text>
          </Pressable>
        ))}
      </View>
    );
  } else if (status === 'pending') {
    footer = (
      <View style={[st.statusCard, { flexDirection: 'row', justifyContent: 'center', paddingVertical: 16 }]}>
        <ActivityIndicator color={B} />
        <Text style={[st.h2, { marginLeft: 10, fontSize: 16 }]}>Čekáme na potvrzení dárce…</Text>
      </View>
    );
  } else if (asking) {
    footer = <Button title="Odeslat žádost" disabled={!msg.trim()} style={{ marginBottom: 0 }} onPress={() => ctx.requestItem(item, msg.trim())} />;
  } else {
    footer = <Button title="🙋  Mám zájem" style={{ marginBottom: 0 }} onPress={() => setAsking(true)} />;
  }

  return (
    <Modal visible={!!item} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1, backgroundColor: '#fff' }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ paddingBottom: 30 }} keyboardShouldPersistTaps="handled">
          <View>
            <Gallery item={item} height={340} />
            <View style={st.detailTopBar}>
              <Pressable onPress={onClose} hitSlop={10} style={st.roundBtn}>
                <Text style={{ fontSize: 18, color: INK }}>✕</Text>
              </Pressable>
              <View style={{ flexDirection: 'row' }}>
                <Pressable onPress={share} hitSlop={10} style={[st.roundBtn, { marginRight: 10 }]}>
                  <Text style={{ fontSize: 17 }}>↗︎</Text>
                </Pressable>
                {!own ? (
                  <Pressable onPress={toggleFav} hitSlop={10} style={st.roundBtn}>
                    <Animated.Text style={{ fontSize: 18, transform: [{ scale: heart }] }}>{fav ? '💜' : '🤍'}</Animated.Text>
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
                <Text style={st.metaTxt}>📍 {own ? 'Tvoje místo' : `${item.km} km`}</Text>
              </View>
              <View style={st.metaChip}>
                <Text style={st.metaTxt}>🕒 {own ? 'právě teď' : `před ${item.m} min`}</Text>
              </View>
              {item.chip ? (
                <View style={st.metaChip}>
                  <Text style={st.metaTxt}>🚪 {item.chip}</Text>
                </View>
              ) : null}
            </View>

            <View style={st.donorCard}>
              <View style={st.avatar}>
                <Text style={{ fontSize: 24 }}>{donor.e}</Text>
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={st.h2}>{own ? 'Tvoje věc' : donor.n}</Text>
                <Text style={st.chartAxis}>
                  {own ? `Daroval jsi ${donor.c} ${donor.c === 1 ? 'věc' : 'věci'}` : `⭐ ${donor.r} • daroval/a ${donor.c} věcí • odpovídá ${donor.resp}`}
                </Text>
              </View>
              {!own ? (
                <View style={st.verified}>
                  <Text style={{ color: B, fontWeight: '800', fontSize: 11 }}>✓ Ověřený</Text>
                </View>
              ) : null}
            </View>

            {item.d ? (
              <>
                <Text style={st.section}>Popis</Text>
                <Text style={st.body}>{item.d}</Text>
              </>
            ) : null}

            <Text style={st.section}>Kde to je</Text>
            <View style={st.miniMap}>
              {MapView ? (
                <MapView
                  style={StyleSheet.absoluteFill}
                  pointerEvents="none"
                  initialRegion={{ latitude: lat, longitude: lng, latitudeDelta: 0.025, longitudeDelta: 0.025 }}
                  scrollEnabled={false}
                  zoomEnabled={false}
                >
                  {MapCircle ? (
                    <MapCircle center={{ latitude: lat, longitude: lng }} radius={600} fillColor="rgba(112,40,232,0.18)" strokeColor={B} strokeWidth={2} />
                  ) : null}
                </MapView>
              ) : (
                <LinearGradient colors={['#EEF6E8', '#DCEFD3']} style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
                  <View style={{ width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(112,40,232,0.18)', borderWidth: 2, borderColor: B }} />
                </LinearGradient>
              )}
            </View>
            <Text style={[st.chartAxis, { marginTop: 8 }]}>🔒 Přesné místo ti dárce pošle až po potvrzení.</Text>

            {own ? (
              <View style={[st.chartCard, { marginTop: 22 }]}>
                <Text style={st.h2}>Stav</Text>
                <Text style={st.chartAxis}>
                  {item.status === 'given'
                    ? '✅ Předáno – díky, že posíláš věci dál!'
                    : item.status === 'reserved'
                    ? '🤝 Rezervováno – zájemce dostal tvůj kontakt.'
                    : incoming.length
                    ? `👀 ${item.views || 0} zobrazení • 🙋 ${incoming.length} zájemci${pending ? ` • čeká ${pending}` : ''}`
                    : `👀 ${item.views || 0} zobrazení • zatím bez zájemců`}
                </Text>
                {item.status !== 'given' ? (
                  <Pressable
                    onPress={() => {
                      ctx.deleteItem(item.id);
                      onClose();
                    }}
                    hitSlop={10}
                  >
                    <Text style={[st.secondary, { marginTop: 14, marginBottom: 0, color: '#FF3B30', textAlign: 'left' }]}>Smazat inzerát</Text>
                  </Pressable>
                ) : null}
              </View>
            ) : null}

            {!own && status === 'accepted' ? (
              <View style={[st.statusCard, { marginTop: 22, backgroundColor: '#DDF7E5' }]}>
                <Text style={st.h2}>✅ Dárce potvrdil – je to tvoje!</Text>
                <Text style={st.chartAxis}>Kontakt je odemčený, ozvi se mu tlačítkem dole.</Text>
              </View>
            ) : null}

            {!own && !status && asking ? (
              <FadeIn style={{ marginTop: 22 }}>
                <Text style={st.section}>Zpráva pro {donor.n}</Text>
                <TextInput value={msg} onChangeText={setMsg} multiline autoFocus style={[st.input, { height: 90, textAlignVertical: 'top' }]} />
              </FadeIn>
            ) : null}
            {!own && !status && !asking ? (
              <Text style={[st.chartAxis, { marginTop: 18 }]}>🔒 Kontakt na dárce se odemkne, až potvrdí tvoji žádost.</Text>
            ) : null}
          </View>
        </ScrollView>
        {footer ? <View style={st.stickyFooter}>{footer}</View> : null}
      </KeyboardAvoidingView>
    </Modal>
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

function DonorPerks({ next }) {
  const steps = useRef(TIERS.map(() => new Animated.Value(0))).current;
  const [price, setPrice] = useState(99);
  const [active, setActive] = useState(-1);
  useEffect(() => {
    const ts = TIERS.map((t, i) =>
      setTimeout(() => {
        setActive(i);
        setPrice(Math.round(99 * (1 - t.pct / 100)));
        tap();
        Animated.spring(steps[i], { toValue: 1, friction: 5, useNativeDriver: true }).start();
        if (i === TIERS.length - 1) success();
      }, 700 + i * 1000)
    );
    return () => ts.forEach(clearTimeout);
  }, []);
  return (
    <StepLayout
      title="Dárci mají TAKE.IT Plus levněji"
      subtitle="Za každou věc, kterou daruješ, ti zlevníme předplatné. S ním uvidíš všechny věci zdarma kolem sebe."
      onNext={next}
    >
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <FadeIn style={[st.chartCard, { alignItems: 'center', paddingVertical: 26 }]}>
          <Text style={st.chartAxis}>TAKE.IT Plus • první měsíc</Text>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', marginTop: 6 }}>
            {price < 99 ? <Text style={[st.strike, { fontSize: 22, marginBottom: 10 }]}>99 Kč</Text> : null}
            <Text style={[st.bigNum, { fontSize: 64 }]}>{price} Kč</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 24, width: '100%', justifyContent: 'space-between' }}>
            <View style={st.perkLine} />
            {TIERS.map((t, i) => (
              <View key={t.n} style={{ alignItems: 'center', width: 90 }}>
                <Animated.View
                  style={[
                    st.perkDot,
                    i <= active && { backgroundColor: B, borderColor: B },
                    { transform: [{ scale: steps[i].interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 1.35, 1] }) }] },
                  ]}
                >
                  <Text style={{ fontSize: 22 }}>{i <= active ? '🎁' : '📦'}</Text>
                </Animated.View>
                <Text style={[st.h2, { marginTop: 8, color: i <= active ? B : SUB }]}>−{t.pct} %</Text>
                <Text style={st.chartAxis}>{t.n} {t.n === 1 ? 'věc' : t.n < 5 ? 'věci' : 'věcí'}</Text>
              </View>
            ))}
          </View>
        </FadeIn>
        <FadeIn delay={3600}>
          <Text style={[st.sub, { textAlign: 'center', marginTop: 22 }]}>Darování je vždycky zdarma. 💜</Text>
        </FadeIn>
      </View>
    </StepLayout>
  );
}

function DiscountUnlocked({ count }) {
  const pct = discountFor(count);
  const a = useRef(new Animated.Value(0)).current;
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const id = a.addListener(({ value }) => setShown(Math.round(value)));
    Animated.timing(a, { toValue: pct, duration: 1200, delay: 600, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start(() => pct && success());
    return () => a.removeListener(id);
  }, [pct]);
  const nt = nextTier(count);
  if (!pct) return null;
  return (
    <View style={[st.statusCard, { marginTop: 16, backgroundColor: B }]}>
      <Text style={{ color: '#fff', fontWeight: '700' }}>Odemkl sis slevu pro dárce</Text>
      <Text style={{ color: '#fff', fontWeight: '900', fontSize: 48 }}>−{shown} %</Text>
      <Text style={{ color: '#EDE5FF', textAlign: 'center' }}>
        na TAKE.IT Plus{nt ? ` • daruj ještě ${nt.n - count} a máš −${nt.pct} %` : ' • maximální sleva 🎉'}
      </Text>
    </View>
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
      Animated.timing(shake, { toValue: 1, duration: 60, useNativeDriver: true }),
      Animated.timing(shake, { toValue: -1, duration: 60, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 1, duration: 60, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
    Animated.spring(grow, { toValue: 1 + t * 0.12, friction: 4, useNativeDriver: true }).start();
    if (t >= 3) {
      setTimeout(() => {
        setOpen(true);
        success();
        ctx.set('welcomeGift', true);
        ctx.addPoints(100);
      }, 250);
    }
  };
  const rewards = [
    ['🌱', 'Odznak Nováček', 'Za to, že jsi s námi od začátku'],
    ['⭐', '+100 bodů dobra', 'Sbírej body za darování a předávání'],
    ['💜', 'Uvítací sleva −20 %', 'Na první období TAKE.IT Plus'],
  ];
  return (
    <StepLayout
      title={open ? 'Tvůj dárek za stažení 🎉' : 'Máme pro tebe dárek'}
      subtitle={open ? 'Díky, že jsi tady. Tohle všechno je tvoje:' : 'Díky, že sis TAKE.IT stáhl. Ťukni 3× na dárek a otevři ho.'}
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

const SetupGiveWrap = SetupGive;
const GIVE_STEPS = [GiveReason, GiveImpact, GiveWhat, GiveAmount, GivePickup, NeighborsMap, GiveSpeed, DonorPerks, NotifyGive, SetupGiveWrap, GiftStep, FirstItem];

function Given({ ctx, onContinue, onRestart }) {
  const item = ctx.myItems[ctx.myItems.length - 1];
  const n = item ? ctx.requests.filter((r) => r.itemId === item.id).length : 0;
  return (
    <SafeAreaView style={st.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, justifyContent: 'center', paddingVertical: 20 }}>
        <FadeIn style={{ alignItems: 'center' }}>
          <Text style={{ fontSize: 64 }}>🎉</Text>
          <Text style={[st.h1, { textAlign: 'center' }]}>{item ? 'Tvoje věc je venku!' : 'Vše nastaveno!'}</Text>
          <Text style={[st.sub, { textAlign: 'center' }]}>
            {item ? 'Dáme ti vědět, jakmile si o ni někdo řekne.' : 'Věc můžeš přidat kdykoli tlačítkem ＋ dole.'}
          </Text>
        </FadeIn>
        {item ? (
          <FadeIn delay={250} style={[st.itemCard, { marginTop: 24, flexDirection: 'row', alignItems: 'center' }]}>
            <LinearGradient colors={item.g} style={{ width: 88, height: 88, alignItems: 'center', justifyContent: 'center' }}>
              {item.uri ? <Image source={{ uri: item.uri }} style={StyleSheet.absoluteFill} /> : <Text style={{ fontSize: 40 }}>{item.e}</Text>}
            </LinearGradient>
            <View style={{ padding: 14, flex: 1 }}>
              <Text style={st.itemTitle}>{item.t}</Text>
              <Text style={{ color: GREEN, fontWeight: '800', marginTop: 4 }}>Zdarma</Text>
              <Text style={st.itemMeta}>
                Kontakt: {CONTACTS.filter((c) => item.contact.methods.includes(c.id)).map((c) => c.e).join(' ')}
              </Text>
            </View>
          </FadeIn>
        ) : null}
        {item ? <DiscountUnlocked count={ctx.myItems.length} /> : null}
        {item ? (
          <FadeIn delay={500} style={[st.statusCard, { marginTop: 16 }]}>
            {n ? (
              <Text style={st.h2}>🙋 Zájemci: {n} – najdeš je v Aktivitě</Text>
            ) : (
              <>
                <ActivityIndicator color={B} />
                <Text style={[st.chartAxis, { textAlign: 'center', marginTop: 8 }]}>
                  Demo: za pár vteřin se ozve první soused – sleduj upozornění 👀
                </Text>
              </>
            )}
          </FadeIn>
        ) : null}
      </ScrollView>
      <View style={{ paddingHorizontal: 24 }}>
        <Button title="Pokračovat do appky" onPress={onContinue} />
        <Pressable onPress={onRestart} hitSlop={10}>
          <Text style={[st.secondary, { marginBottom: 0, marginTop: 14 }]}>Začít znovu (test)</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

// ---------- CHCI ZDARMA ----------
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
    Animated.timing(a, { toValue: sum, duration: 1500, delay: rows.length * 320 + 300, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start(() => success());
    return () => a.removeListener(id);
  }, []);
  return (
    <StepLayout title="Kolik můžeš ušetřit?" subtitle="Příklad: kolik by tyhle věci stály z druhé ruky." onNext={next}>
      <View style={st.chartCard}>
        {rows.map(([e, n, p], i) => (
          <FadeIn key={n} delay={200 + i * 320} style={st.saveRow}>
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
    Animated.stagger(350, [
      Animated.timing(a, { toValue: 1, duration: 900, easing: Easing.out(Easing.cubic), useNativeDriver: false }),
      Animated.timing(b, { toValue: 1, duration: 600, easing: Easing.out(Easing.cubic), useNativeDriver: false }),
    ]).start();
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

function Paywall({ visible, onClose, onUnlock, discount = 0 }) {
  const [plan, setPlan] = useState('year');
  const [busy, setBusy] = useState(false);
  const f = (p) => Math.round(p * (1 - discount / 100));
  const plans = [
    { id: 'year', name: 'Roční', base: 499, note: discount ? 'první rok' : '41 Kč měsíčně', badge: 'Nejvýhodnější' },
    { id: 'month', name: 'Měsíční', base: 99, note: discount ? 'první měsíc, pak 99 Kč' : 'měsíčně' },
    { id: 'week', name: 'Týdenní', base: 39, note: discount ? 'první týden, pak 39 Kč' : 'týdně' },
  ].map((p) => ({ ...p, price: `${f(p.base)} Kč`, old: discount ? `${p.base} Kč` : null }));
  const buy = () => {
    setBusy(true);
    setTimeout(() => {
      setBusy(false);
      success();
      onUnlock(plan);
    }, 1200);
  };
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <SafeAreaProvider>
        <SafeAreaView style={st.safe} edges={['top', 'bottom']}>
          <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 16 }}>
            <Pressable onPress={onClose} hitSlop={14} style={{ alignSelf: 'flex-end', padding: 6 }}>
              <Text style={{ fontSize: 26, color: SUB }}>×</Text>
            </Pressable>
            <View style={{ alignItems: 'center' }}>
              <AppIcon size={88} />
              <Text style={[st.h1, { textAlign: 'center', marginTop: 20 }]}>Odemkni TAKE.IT Plus</Text>
              <Text style={[st.sub, { textAlign: 'center' }]}>Nejlepší věci zmizí rychle. Buď u nich první.</Text>
              {discount ? (
                <View style={[st.discountPill, { marginTop: 14 }]}>
                  <Text style={{ color: '#fff', fontWeight: '800' }}>🎁 Tvoje sleva −{discount} % je započítaná</Text>
                </View>
              ) : (
                <Text style={[st.chartAxis, { textAlign: 'center', marginTop: 12 }]}>
                  💡 Daruj věc a získáš slevu až −60 %
                </Text>
              )}
            </View>
            <View style={{ marginTop: 22 }}>
              {['Všechny věci zdarma ve tvém okolí', 'Okamžitá upozornění na nové věci', 'Rezervace jedním klepnutím', 'Bez reklam'].map((t) => (
                <View key={t} style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 6 }}>
                  <View style={[st.check, { backgroundColor: B, width: 26, height: 26 }]}>
                    <Text style={{ color: '#fff', fontWeight: '900', fontSize: 13 }}>✓</Text>
                  </View>
                  <Text style={{ fontSize: 17, marginLeft: 12, color: INK }}>{t}</Text>
                </View>
              ))}
            </View>
            <View style={{ marginTop: 18 }}>
              {plans.map((p) => (
                <Pressable
                  key={p.id}
                  onPress={() => {
                    tap();
                    setPlan(p.id);
                  }}
                  style={[st.plan, plan === p.id && st.planSel]}
                >
                  <View style={[st.radio, plan === p.id && { borderColor: B }]}>
                    {plan === p.id ? <View style={st.radioDot} /> : null}
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={st.h2}>{p.name}</Text>
                    <Text style={st.chartAxis}>{p.note}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    {p.old ? <Text style={[st.strike, { marginRight: 0, fontSize: 13 }]}>{p.old}</Text> : null}
                    <Text style={[st.h2, { color: plan === p.id ? B : INK }]}>{p.price}</Text>
                  </View>
                  {p.badge ? (
                    <View style={st.planBadge}>
                      <Text style={st.planBadgeTxt}>{p.badge}</Text>
                    </View>
                  ) : null}
                </Pressable>
              ))}
            </View>
          </ScrollView>
          <View style={{ paddingHorizontal: 24 }}>
            <Button title={busy ? 'Zpracovávám…' : plan === 'year' ? 'Vyzkoušet 3 dny zdarma' : 'Pokračovat'} disabled={busy} onPress={buy} />
            <Text style={[st.chartAxis, { textAlign: 'center', marginTop: 10 }]}>
              Demo – nic se neúčtuje • Obnovit nákup • Podmínky
            </Text>
          </View>
        </SafeAreaView>
      </SafeAreaProvider>
    </Modal>
  );
}

function LockedGrid() {
  return (
    <View style={Platform.OS === 'web' ? { filter: 'blur(14px)', transform: [{ scale: 1.04 }] } : { opacity: 0.9 }}>
      <Grid items={ITEMS.slice(0, 8)} />
    </View>
  );
}

function Spark({ x, y, size, delay, dur, drift }) {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(a, { toValue: 1, duration: dur, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(a, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: '#fff',
        borderWidth: 0.5,
        borderColor: 'rgba(112,40,232,0.25)',
        shadowColor: '#fff',
        shadowOpacity: 1,
        shadowRadius: 3,
        opacity: a.interpolate({ inputRange: [0, 0.3, 0.7, 1], outputRange: [0, 1, 0.9, 0] }),
        transform: [
          { translateY: a.interpolate({ inputRange: [0, 1], outputRange: [0, 40] }) },
          { translateX: a.interpolate({ inputRange: [0, 1], outputRange: [0, drift] }) },
          { scale: a.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0.4, 1.2, 0.6] }) },
        ],
      }}
    />
  );
}

function Sparkles({ count = 70 }) {
  const H = Dimensions.get('window').height;
  const sparks = useRef(
    Array.from({ length: count }, () => ({
      x: Math.random() * W,
      y: Math.random() * H * 0.75,
      size: 1.5 + Math.random() * 3,
      delay: Math.random() * 3000,
      dur: 1800 + Math.random() * 2600,
      drift: (Math.random() - 0.5) * 24,
    }))
  ).current;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {sparks.map((p, i) => (
        <Spark key={i} {...p} />
      ))}
    </View>
  );
}

function LockedOverlay({ ctx, onUnlock, onSkip }) {
  const sheet = useRef(new Animated.Value(0)).current;
  const marquee = useRef(new Animated.Value(0)).current;
  const glow = useRef(new Animated.Value(0)).current;
  const [idx, setIdx] = useState(0);
  const fade = useRef(new Animated.Value(1)).current;
  const di = discInfo(ctx);
  const disc = di.pct;
  useEffect(() => {
    Animated.spring(sheet, { toValue: 1, friction: 8, tension: 40, delay: 500, useNativeDriver: true }).start();
    Animated.loop(Animated.timing(marquee, { toValue: 1, duration: 9000, easing: Easing.linear, useNativeDriver: true })).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(glow, { toValue: 0, duration: 900, useNativeDriver: true }),
      ])
    ).start();
    const t = setInterval(() => {
      Animated.timing(fade, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
        setIdx((i) => (i + 1) % ITEMS.length);
        Animated.timing(fade, { toValue: 1, duration: 250, useNativeDriver: true }).start();
      });
    }, 2200);
    return () => clearInterval(t);
  }, []);
  const it = ITEMS[idx];
  const row = [...ITEMS, ...ITEMS];
  const rowW = ITEMS.length * 64;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {Platform.OS !== 'web' ? (
        <BlurView intensity={60} tint="light" experimentalBlurMethod="dimezisBlurView" style={StyleSheet.absoluteFill} />
      ) : null}
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255,255,255,0.35)' }]} />
      <LinearGradient colors={['rgba(255,255,255,0)', 'rgba(112,40,232,0.18)']} style={StyleSheet.absoluteFill} pointerEvents="none" />
      <Sparkles />
      <Animated.View
        style={[
          st.sheet,
          { transform: [{ translateY: sheet.interpolate({ inputRange: [0, 1], outputRange: [520, 0] }) }] },
        ]}
      >
        <View style={st.sheetHandle} />
        <Animated.View style={[st.liveRow, { opacity: fade }]}>
          <View style={st.liveDot} />
          <Text style={{ color: INK, fontWeight: '700' }} numberOfLines={1}>
            Právě přidáno: {it.e} {it.t} • {it.km} km
          </Text>
        </Animated.View>
        <Text style={[st.h1, { fontSize: 28, lineHeight: 34, textAlign: 'center', marginTop: 14 }]}>37 věcí zdarma čeká kolem tebe</Text>
        <Text style={[st.sub, { textAlign: 'center' }]}>Nové přibývají každou hodinu. Odemkni seznam i mapu a buď u nich první.</Text>
        <View style={{ height: 64, overflow: 'hidden', marginTop: 16, marginHorizontal: -24 }}>
          <Animated.View
            style={{ flexDirection: 'row', transform: [{ translateX: marquee.interpolate({ inputRange: [0, 1], outputRange: [0, -rowW] }) }] }}
          >
            {row.map((x, i) => (
              <Thumb key={i} item={x} emojiSize={26} style={st.marqueeChip} />
            ))}
          </Animated.View>
        </View>
        {disc ? (
          <View style={[st.discountPill, { alignSelf: 'center', marginTop: 14 }]}>
            <Text style={{ color: '#fff', fontWeight: '800' }}>🎁 Máš slevu −{disc} % ({di.label})</Text>
          </View>
        ) : (
          <Text style={[st.chartAxis, { textAlign: 'center', marginTop: 12 }]}>💡 Daruj věc a získáš slevu až −60 %</Text>
        )}
        <Animated.View style={{ marginTop: 16, transform: [{ scale: glow.interpolate({ inputRange: [0, 1], outputRange: [1, 1.03] }) }] }}>
          <Button title="Odemknout seznam a mapu" onPress={onUnlock} style={{ marginBottom: 0 }} />
        </Animated.View>
        {onSkip ? (
          <Pressable onPress={onSkip} hitSlop={10}>
            <Text style={[st.secondary, { marginTop: 14, marginBottom: 0 }]}>Teď ne</Text>
          </Pressable>
        ) : null}
      </Animated.View>
    </View>
  );
}

function LockedFeed({ next, ctx }) {
  const [pay, setPay] = useState(false);
  return (
    <View style={{ flex: 1 }}>
      <View style={{ flex: 1, overflow: 'hidden' }}>
        <View style={{ paddingHorizontal: 24 }} pointerEvents="none">
          <LockedGrid />
        </View>
        <LockedOverlay ctx={ctx} onUnlock={() => setPay(true)} onSkip={next} />
      </View>
      <Paywall
        visible={pay}
        discount={discInfo(ctx).pct}
        onClose={() => setPay(false)}
        onUnlock={(pl) => {
          setPay(false);
          ctx.unlock(pl);
          next();
        }}
      />
    </View>
  );
}

const TAKE_STEPS = [TakeCategories, TakeSavings, TakeCompare, TakeDistance, NotifyTake, SetupTake, GiftStep, LockedFeed];

// ---------- Hlavní appka (záložky) ----------
function Header({ title, right }) {
  return (
    <View style={st.feedHeader}>
      {title ? <Text style={[st.h1, { fontSize: 30 }]}>{title}</Text> : <Logo size={30} />}
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

function ItemsMap({ items, selected, onSelect, onOpen }) {
  const card = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(card, { toValue: selected ? 1 : 0, friction: 8, useNativeDriver: true }).start();
  }, [selected]);
  return (
    <View style={{ flex: 1 }}>
      {MapView ? (
        <MapView
          style={StyleSheet.absoluteFill}
          initialRegion={{ ...CENTER, latitudeDelta: 0.06, longitudeDelta: 0.06 }}
          onPress={() => onSelect(null)}
        >
          <Marker coordinate={CENTER}>
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
              <Text style={st.itemMeta}>{selected.demo ? `${selected.km} km • před ${selected.m} min` : 'Tvoje věc'}</Text>
            </View>
            <Text style={{ fontSize: 26, color: B, fontWeight: '700' }}>›</Text>
          </Pressable>
        </Animated.View>
      ) : (
        <View style={st.mapHint} pointerEvents="none">
          <Text style={{ fontWeight: '700', color: INK }}>📍 {items.length} věcí v okolí • klepni na špendlík</Text>
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
            <Text style={[st.bigNum, { fontSize: 36 }]}>do {d.km} km</Text>
          </View>
          <Slider value={d.km} min={1} max={20} onChange={(v) => setD((x) => ({ ...x, km: v }))} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={st.chartAxis}>1 km</Text>
            <Text style={st.chartAxis}>20 km</Text>
          </View>

          <Text style={[st.label, { marginTop: 24 }]}>Řadit podle</Text>
          <View style={st.segment}>
            {[
              ['new', '🕒 Nejnovější'],
              ['near', '📍 Nejblíž'],
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
                style={[st.catChip, d.cats.includes(c) && st.catChipSel]}
              >
                <Text style={[st.catTxt, d.cats.includes(c) && { color: B }]}>{e}  {c}</Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
        <View style={st.stickyFooter}>
          <Button title={n ? `Zobrazit ${n} ${n === 1 ? 'věc' : n < 5 ? 'věci' : 'věcí'}` : 'Nic neodpovídá filtrům'} disabled={!n} style={{ marginBottom: 0 }} onPress={() => onApply(d)} />
        </View>
      </View>
    </Modal>
  );
}

function HomeTab({ ctx }) {
  const [open, setOpen] = useState(null);
  const [q, setQ] = useState('');
  const [f, setF] = useState({ cats: [], km: ctx.data.km || 20, sort: 'new' });
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [view, setView] = useState('list');
  const [sel, setSel] = useState(null);
  const [pay, setPay] = useState(false);
  const own = ctx.myItems
    .filter((x) => x.status !== 'given')
    .map((x, i) => ({
      ...x,
      lat: CENTER.latitude - 0.002 - i * 0.0015,
      lng: CENTER.longitude + 0.003,
      badge: x.status === 'reserved' ? 'REZERVOVÁNO' : 'TVOJE',
      badgeColor: x.status === 'reserved' ? '#FF9500' : B,
    }));
  const items = [
    ...own,
    ...ITEMS.map((it) =>
      ctx.outReq[it.t] === 'accepted'
        ? { ...it, badge: 'TVOJE 🎉', badgeColor: B }
        : ctx.outReq[it.t] === 'pending'
        ? { ...it, badge: 'ČEKÁ', badgeColor: '#FF9500' }
        : it
    ),
  ];
  const current = open ? items.find((x) => (x.id || x.t) === (open.id || open.t)) || null : null;
  const disc = discInfo(ctx).pct;
  const kmNum = (x) => parseFloat(String(x.km).replace(',', '.')) || 0;
  const filtered = items
    .filter((x) => {
      if (!x.demo) return !q.trim() || x.t.toLowerCase().includes(q.trim().toLowerCase());
      if (q.trim() && !(x.t + ' ' + (x.cat || '')).toLowerCase().includes(q.trim().toLowerCase())) return false;
      if (f.cats.length && !f.cats.includes(x.cat)) return false;
      if (kmNum(x) > f.km) return false;
      return true;
    })
    .sort((a, b) => (!a.demo ? -1 : !b.demo ? 1 : f.sort === 'near' ? kmNum(a) - kmNum(b) : a.m - b.m));
  const activeFilters = f.cats.length + (f.km < 20 ? 1 : 0) + (f.sort !== 'new' ? 1 : 0);
  const quick = ['Vše', ...CATEGORIES.map(([e, c]) => c)];
  return (
    <View style={{ flex: 1 }}>
      <Header />
      {ctx.data.unlocked ? (
        <View style={{ flex: 1 }}>
          <View style={{ paddingHorizontal: 24 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={st.searchBox}>
                <Text style={{ fontSize: 16 }}>🔍</Text>
                <TextInput
                  value={q}
                  onChangeText={setQ}
                  placeholder="Hledat věci…"
                  placeholderTextColor="#9A9AA0"
                  style={{ flex: 1, fontSize: 16, marginLeft: 8, color: INK, paddingVertical: 0 }}
                  returnKeyType="search"
                />
                {q ? (
                  <Pressable onPress={() => setQ('')} hitSlop={10}>
                    <Text style={{ color: SUB, fontSize: 16 }}>✕</Text>
                  </Pressable>
                ) : null}
              </View>
              <Pressable
                onPress={() => {
                  tap();
                  setFiltersOpen(true);
                }}
                style={[st.filterBtn, activeFilters && { backgroundColor: B }]}
              >
                <Text style={{ fontSize: 18, color: activeFilters ? '#fff' : INK }}>⚙︎</Text>
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
                {filtered.length} {filtered.length === 1 ? 'věc' : filtered.length < 5 ? 'věci' : 'věcí'} • do {f.km} km
              </Text>
              <View style={[st.segment, { marginBottom: 0, width: 190 }]}>
                {[
                  ['list', '☰ Seznam'],
                  ['map', '🗺️ Mapa'],
                ].map(([k, l]) => (
                  <Pressable
                    key={k}
                    onPress={() => {
                      tap();
                      setView(k);
                      setSel(null);
                    }}
                    style={[st.segBtn, view === k && st.segBtnOn]}
                  >
                    <Text style={[st.segTxt, view === k && { color: INK }]}>{l}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>
          {filtered.length === 0 ? (
            <View style={{ alignItems: 'center', marginTop: 50, paddingHorizontal: 24 }}>
              <Text style={{ fontSize: 48 }}>🔍</Text>
              <Text style={[st.h2, { marginTop: 10 }]}>Nic jsme nenašli</Text>
              <Text style={[st.chartAxis, { textAlign: 'center' }]}>Zkus jiné slovo nebo uvolni filtry.</Text>
              <Button
                title="Zrušit filtry"
                light
                style={{ marginTop: 16, paddingHorizontal: 30 }}
                onPress={() => {
                  setQ('');
                  setF({ cats: [], km: 20, sort: 'new' });
                }}
              />
            </View>
          ) : view === 'list' ? (
            <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 30 }} keyboardShouldPersistTaps="handled">
              <Grid
                items={filtered}
                onItem={(it) => {
                  tap();
                  setOpen(it);
                }}
              />
            </ScrollView>
          ) : (
            <ItemsMap
              items={filtered}
              selected={sel}
              onSelect={(it) => {
                tap();
                setSel(it);
              }}
              onOpen={(it) => setOpen(it)}
            />
          )}
        </View>
      ) : (
        <View style={{ flex: 1, overflow: 'hidden' }}>
          <View style={{ paddingHorizontal: 24 }} pointerEvents="none">
            <LockedGrid />
          </View>
          <LockedOverlay ctx={ctx} onUnlock={() => setPay(true)} />
        </View>
      )}
      <ItemDetail item={current} onClose={() => setOpen(null)} ctx={ctx} />
      <FiltersSheet
        visible={filtersOpen}
        value={f}
        count={(nf) => items.filter((x) => x.demo && (!nf.cats.length || nf.cats.includes(x.cat)) && kmNum(x) <= nf.km).length}
        onClose={() => setFiltersOpen(false)}
        onApply={(nf) => {
          setF(nf);
          setFiltersOpen(false);
        }}
      />
      <Paywall
        visible={pay}
        discount={disc}
        onClose={() => setPay(false)}
        onUnlock={(pl) => {
          setPay(false);
          ctx.unlock(pl);
        }}
      />
    </View>
  );
}

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
  const n = ctx.myItems.length;
  const nt = nextTier(n);
  return (
    <View style={{ flex: 1 }}>
      <Header title="Moje věci" />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 30 }}>
        <View style={[st.chartCard, { flexDirection: 'row', alignItems: 'center', marginBottom: 16 }]}>
          <Text style={{ fontSize: 34 }}>🎁</Text>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={st.h2}>{discountFor(n) ? `Sleva pro dárce −${discountFor(n)} %` : 'Získej slevu pro dárce'}</Text>
            <Text style={st.chartAxis}>{nt ? `Daruj ještě ${nt.n - n} → −${nt.pct} % na TAKE.IT Plus` : 'Máš maximální slevu 🎉'}</Text>
            <View style={[st.hTrack, { height: 8 }]}>
              <View style={[st.hBar, { backgroundColor: B, width: `${Math.min(100, (n / 5) * 100)}%` }]} />
            </View>
          </View>
        </View>
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
            <Text style={{ fontSize: 48 }}>{seg === 'given' ? '🤝' : '📦'}</Text>
            <Text style={[st.h2, { marginTop: 10 }]}>{seg === 'active' ? 'Nic tu zatím není' : seg === 'reserved' ? 'Žádné rezervace' : 'Zatím nic předaného'}</Text>
            {seg === 'active' ? <Button title="＋ Darovat věc" style={{ marginTop: 16, paddingHorizontal: 30 }} onPress={ctx.openAdd} /> : null}
          </View>
        ) : null}
        {list.map((it, i) => {
          const req = ctx.requests.filter((r) => r.itemId === it.id);
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
                <LinearGradient colors={it.g} style={{ width: 80, height: 80, alignItems: 'center', justifyContent: 'center' }}>
                  {it.uri ? <Image source={{ uri: it.uri }} style={StyleSheet.absoluteFill} /> : <Text style={{ fontSize: 34 }}>{it.e}</Text>}
                </LinearGradient>
                <View style={{ padding: 12, flex: 1 }}>
                  <Text style={st.itemTitle}>{it.t}</Text>
                  <Text style={st.itemMeta}>
                    {it.status === 'given' ? '✅ Předáno' : it.status === 'reserved' ? '🤝 Rezervováno' : `👀 ${it.views} zobrazení • 🙋 ${req.length}`}
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

function ActivityTab({ ctx }) {
  const incoming = ctx.requests;
  const outgoing = Object.entries(ctx.outReq);
  return (
    <View style={{ flex: 1 }}>
      <Header title="Aktivita" />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 30 }}>
        <Text style={st.section}>Žádosti o tvoje věci</Text>
        {incoming.length === 0 ? (
          <Text style={st.chartAxis}>Zatím nikdo. Jakmile se někdo přihlásí, přijde ti upozornění.</Text>
        ) : null}
        {[...incoming].reverse().map((r, i) => (
          <FadeIn key={r.id} delay={i * 60} style={[st.reqCard, r.status === 'declined' && { opacity: 0.5 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={st.avatar}>
                <Text style={{ fontSize: 24 }}>{r.e}</Text>
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={st.h2}>{r.from}</Text>
                <Text style={st.chartAxis}>chce „{r.itemT}“ • {r.km} km • {timeAgo(r.at)}</Text>
              </View>
            </View>
            <Text style={[st.body, { marginTop: 10 }]}>„{r.msg}“</Text>
            {r.status === 'pending' ? (
              <View style={{ flexDirection: 'row', marginTop: 12 }}>
                <Button title="Potvrdit" style={{ flex: 1, height: 48, marginRight: 8, marginBottom: 0 }} onPress={() => ctx.accept(r.id)} />
                <Button title="Odmítnout" light style={{ flex: 1, height: 48, marginBottom: 0 }} onPress={() => ctx.decline(r.id)} />
              </View>
            ) : (
              <Text style={[st.chartAxis, { marginTop: 10, fontWeight: '700', color: r.status === 'accepted' ? GREEN : SUB }]}>
                {r.status === 'accepted' ? '✅ Potvrzeno – poslali jsme mu tvůj kontakt' : 'Odmítnuto'}
              </Text>
            )}
          </FadeIn>
        ))}
        <Text style={[st.section, { marginTop: 28 }]}>Tvoje žádosti</Text>
        {outgoing.length === 0 ? <Text style={st.chartAxis}>O nic sis zatím neřekl. Klepni ve feedu na věc a dej „Mám zájem“.</Text> : null}
        {outgoing.map(([t, stt]) => {
          const it = ITEMS.find((x) => x.t === t);
          return (
            <View key={t} style={[st.reqCard, { flexDirection: 'row', alignItems: 'center' }]}>
              {it ? <Thumb item={it} emojiSize={24} style={[st.avatar, { borderRadius: 14 }]} /> : null}
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={st.h2}>{t}</Text>
                <Text style={[st.chartAxis, stt === 'accepted' && { color: GREEN, fontWeight: '700' }]}>
                  {stt === 'accepted' ? '✅ Dárce potvrdil – kontakt odemčen' : '⏳ Čeká na potvrzení dárce'}
                </Text>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

function ProfileTab({ ctx, onRestart }) {
  const [pay, setPay] = useState(false);
  const given = ctx.myItems.length;
  const gotItems = ITEMS.filter((x) => ctx.outReq[x.t] === 'accepted');
  const got = gotItems.length;
  const saved = gotItems.reduce((sum, x) => sum + x.v, 0);
  const di = discInfo(ctx);
  const disc = di.pct;
  const plus = ctx.data.unlocked;
  const planName = { year: 'Roční', month: 'Měsíční', week: 'Týdenní' }[ctx.data.plan] || 'Roční';
  const renew = new Date((ctx.data.planAt || Date.now()) + ({ year: 365, month: 30, week: 7 }[ctx.data.plan] || 365) * 864e5);
  const c = ctx.data.savedContact;
  const name = ctx.data.name || '';
  return (
    <View style={{ flex: 1 }}>
      <Header title="Profil" />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 30 }}>
        <View style={{ alignItems: 'center' }}>
          <View style={st.bigAvatar}>
            <Text style={{ color: '#fff', fontSize: 40, fontWeight: '900' }}>{(name.trim()[0] || '🙂').toUpperCase()}</Text>
          </View>
          <TextInput
            value={name}
            onChangeText={(v) => ctx.set('name', v)}
            placeholder="Tvoje jméno"
            placeholderTextColor="#B5B5BA"
            style={[st.h1, { fontSize: 26, textAlign: 'center', marginTop: 12, minWidth: 200 }]}
          />
          {plus ? (
            <View style={[st.discountPill, { marginTop: 6, paddingVertical: 4 }]}>
              <Text style={{ color: '#fff', fontWeight: '900', fontSize: 12 }}>✦ PLUS</Text>
            </View>
          ) : null}
          <Text style={[st.chartAxis, { marginTop: 6 }]}>📍 Praha • na TAKE.IT od dneška</Text>
          <View style={[st.pointsPill, { marginTop: 10 }]}>
            <Text style={{ fontWeight: '900', color: B }}>⭐ {ctx.points} bodů dobra</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', marginTop: 20 }}>
          {[
            [given, 'darováno'],
            [got, 'získáno'],
            [`${kc(saved)} Kč`, 'ušetřeno'],
          ].map(([v, l]) => (
            <View key={l} style={st.statBox}>
              <Text style={[st.bigNum, { fontSize: 26 }]}>{v}</Text>
              <Text style={st.chartAxis}>{l}</Text>
            </View>
          ))}
        </View>
        <Text style={[st.chartAxis, { textAlign: 'center', marginTop: 8, fontSize: 12 }]}>
          ♻️ ~{(given + got) * 8} kg věcí mimo skládku • ušetřeno = odhad ceny z bazaru
        </Text>

        <Text style={st.section}>Odznaky</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
          {[
            ['🌱', 'Nováček', !!ctx.data.welcomeGift],
            ['🎁', 'První dar', given >= 1],
            ['🤝', 'Dobrý soused', ctx.myItems.some((x) => x.status === 'given')],
            ['🔎', 'Lovec pokladů', got >= 1],
          ].map(([e, l, on]) => (
            <View key={l} style={[st.badgeBox, !on && { opacity: 0.35 }]}>
              <Text style={{ fontSize: 30 }}>{on ? e : '🔒'}</Text>
              <Text style={[st.chartAxis, { color: on ? INK : SUB, fontWeight: '700', textAlign: 'center' }]}>{l}</Text>
            </View>
          ))}
        </View>

        <Text style={st.section}>TAKE.IT Plus</Text>
        {plus ? (
          <LinearGradient colors={['#7028E8', '#9B5CFF']} style={st.plusCard}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Logo size={24} color="#fff" />
              <Text style={{ color: '#fff', fontWeight: '800' }}>✓ Aktivní</Text>
            </View>
            <Text style={{ color: '#fff', fontSize: 22, fontWeight: '900', marginTop: 16 }}>{planName} předplatné</Text>
            <Text style={{ color: '#EDE5FF', marginTop: 4 }}>
              Obnovení {renew.getDate()}. {renew.getMonth() + 1}. {renew.getFullYear()}
              {disc ? ` • sleva pro dárce −${disc} %` : ''}
            </Text>
            <View style={st.plusStat}>
              <Text style={{ color: '#fff', fontWeight: '700' }}>Díky Plus jsi ušetřil</Text>
              <Text style={{ color: '#fff', fontWeight: '900', fontSize: 28 }}>{kc(saved)} Kč</Text>
            </View>
            <Pressable
              onPress={() => Alert.alert('Předplatné', 'V ostré verzi se tady otevře správa předplatného v App Store.')}
              hitSlop={8}
            >
              <Text style={{ color: '#fff', fontWeight: '700', textAlign: 'center', marginTop: 14, textDecorationLine: 'underline' }}>
                Spravovat předplatné
              </Text>
            </Pressable>
          </LinearGradient>
        ) : null}
        {gotItems.length ? (
          <>
            <Text style={st.section}>Získané věci</Text>
            {gotItems.map((x) => (
              <View key={x.t} style={[st.reqCard, { flexDirection: 'row', alignItems: 'center' }]}>
                <Thumb item={x} emojiSize={24} style={[st.avatar, { borderRadius: 14 }]} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={st.h2}>{x.t}</Text>
                  <Text style={st.chartAxis}>od souseda • {x.km} km</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[st.strike, { marginRight: 0 }]}>{kc(x.v)} Kč</Text>
                  <Text style={st.zero}>0 Kč</Text>
                </View>
              </View>
            ))}
          </>
        ) : null}
        {plus ? null : (
        <View style={st.chartCard}>
          <Text style={st.h2}>{ctx.data.unlocked ? '✅ Aktivní' : 'Neaktivní'}</Text>
          <Text style={st.chartAxis}>
            {disc ? `Tvoje sleva: −${disc} % (${di.label})` : 'Daruj první věc a získáš −20 %'}
            {nextTier(given) ? ` • další stupeň za ${nextTier(given).n - given} ${nextTier(given).n - given === 1 ? 'věc' : 'věci'}` : ''}
          </Text>
          <Button title="Aktivovat" style={{ marginTop: 12, marginBottom: 0 }} onPress={() => setPay(true)} />
        </View>
        )}

        <Text style={st.section}>Kontakt pro zájemce</Text>
        <View style={st.chartCard}>
          {c ? (
            <>
              <Text style={{ fontSize: 22 }}>{CONTACTS.filter((x) => c.methods.includes(x.id)).map((x) => x.e).join('  ')}</Text>
              {c.phone && c.phone.length > 5 ? <Text style={st.chartAxis}>📱 {c.phone}</Text> : null}
              {c.messenger ? <Text style={st.chartAxis} numberOfLines={1}>⚡ {c.messenger}</Text> : null}
              <Text style={[st.chartAxis, { marginTop: 6 }]}>Předvyplní se u každé další věci.</Text>
            </>
          ) : (
            <Text style={st.chartAxis}>Uloží se, až přidáš první věc.</Text>
          )}
        </View>

        <Text style={st.section}>Nastavení</Text>
        <View style={[st.chartCard, { paddingVertical: 4 }]}>
          {[
            ['📍', 'Okruh', `${ctx.data.km || 5} km`],
            ['🏷️', 'Kategorie', ctx.data.cats && ctx.data.cats.length ? `${ctx.data.cats.length} vybráno` : 'Vše'],
            ['🔔', 'Upozornění', `${ctx.data.notify ?? 3}× denně`],
            ['🔒', 'Soukromí', 'Kontakt jen po potvrzení'],
          ].map(([e, l, v], i) => (
            <View key={l} style={[st.settingRow, i > 0 && { borderTopWidth: 1, borderTopColor: '#E8E8ED' }]}>
              <Text style={{ fontSize: 18 }}>{e}</Text>
              <Text style={[st.body, { flex: 1, marginLeft: 12 }]}>{l}</Text>
              <Text style={st.chartAxis}>{v}</Text>
            </View>
          ))}
        </View>
        <Pressable onPress={onRestart} hitSlop={10}>
          <Text style={[st.secondary, { marginTop: 24, color: '#FF3B30' }]}>Resetovat demo</Text>
        </Pressable>
      </ScrollView>
      <Paywall
        visible={pay}
        discount={disc}
        onClose={() => setPay(false)}
        onUnlock={(pl) => {
          setPay(false);
          ctx.unlock(pl);
        }}
      />
    </View>
  );
}

const TABS = [
  ['home', '🏠', 'Domů'],
  ['mine', '📦', 'Moje věci'],
  ['add', '＋', ''],
  ['activity', '🔔', 'Aktivita'],
  ['profile', '👤', 'Profil'],
];

function MainApp({ ctx, onRestart }) {
  const pending = ctx.requests.filter((r) => r.status === 'pending').length;
  const tab = ctx.tab;
  return (
    <SafeAreaView style={st.safe} edges={['top', 'bottom']}>
      <View style={{ flex: 1 }}>
        {tab === 'home' ? <HomeTab ctx={ctx} /> : null}
        {tab === 'mine' ? <MyItemsTab ctx={ctx} /> : null}
        {tab === 'activity' ? <ActivityTab ctx={ctx} /> : null}
        {tab === 'profile' ? <ProfileTab ctx={ctx} onRestart={onRestart} /> : null}
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
              <Text style={{ color: '#fff', fontSize: 30, fontWeight: '700', marginTop: -2 }}>＋</Text>
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
              <Text style={{ fontSize: 22, opacity: tab === k ? 1 : 0.45 }}>{e}</Text>
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

// ---------- Root ----------
const NEIGHBORS = [
  { from: 'Petr', e: '👨‍🦰', km: '0,8', msg: 'Ahoj, můžu si to vyzvednout dnes v 18:00?', delay: 5000 },
  { from: 'Jana', e: '👩', km: '1,4', msg: 'Dobrý den, mám zájem, bydlím kousek od vás 🙂', delay: 13000 },
];

function Root() {
  const [route, setRoute] = useState('welcome');
  const [points, setPoints] = useState(0);
  const [tab, setTab] = useState('home');
  const [data, setData] = useState({});
  const [myItems, setMyItems] = useState([]);
  const [requests, setRequests] = useState([]);
  const [outReq, setOutReq] = useState({});
  const [addOpen, setAddOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const timers = useRef([]);
  const later = (fn, ms) => timers.current.push(setTimeout(fn, ms));

  const notify = async (title, body, payload) => {
    let shown = false;
    try {
      const { status } = await Notifications.getPermissionsAsync();
      if (status === 'granted') {
        await Notifications.scheduleNotificationAsync({ content: { title, body, data: payload, sound: true }, trigger: null });
        shown = true;
      }
    } catch (e) {}
    if (!shown) setToast({ title, body, data: payload });
  };

  useEffect(() => {
    let sub;
    try {
      sub = Notifications.addNotificationResponseReceivedListener((r) => {
        const t = r.notification.request.content.data && r.notification.request.content.data.type;
        if (t === 'request') {
          setRoute('main');
          setTab('activity');
        }
      });
    } catch (e) {}
    return () => sub && sub.remove();
  }, []);

  const ctx = {
    data,
    set: (k, v) => setData((d) => ({ ...d, [k]: v })),
    points,
    addPoints: (n) => setPoints((p) => p + n),
    myItems,
    requests,
    outReq,
    tab,
    setTab,
    addOpen,
    openAdd: () => setAddOpen(true),
    closeAdd: () => setAddOpen(false),
    openInbox: () => {
      setRoute('main');
      setTab('activity');
    },
    addItem: (it) => {
      const id = 'my' + Date.now();
      setMyItems((xs) => [...xs, { ...it, id, status: 'active', views: 0, at: Date.now() }]);
      setPoints((p) => p + 50);
      later(() => setMyItems((xs) => xs.map((x) => (x.id === id ? { ...x, views: x.views + 7 } : x))), 3000);
      NEIGHBORS.forEach((n) =>
        later(() => {
          setRequests((rs) => [...rs, { ...n, id: n.from + Date.now(), itemId: id, itemT: it.t, status: 'pending', at: Date.now() }]);
          success();
          notify(`${n.from} chce „${it.t}“ 👋`, n.msg, { type: 'request' });
        }, n.delay)
      );
    },
    accept: (rid) => {
      const r = requests.find((x) => x.id === rid);
      if (!r) return;
      setRequests((rs) =>
        rs.map((x) => (x.id === rid ? { ...x, status: 'accepted' } : x.itemId === r.itemId && x.status === 'pending' ? { ...x, status: 'declined' } : x))
      );
      setMyItems((xs) => xs.map((x) => (x.id === r.itemId ? { ...x, status: 'reserved' } : x)));
      success();
      setToast({ title: 'Potvrzeno 🎉', body: `${r.from} dostal upozornění a tvůj kontakt. Po předání označ věc jako předanou.` });
    },
    unlock: (pl) => {
      setData((d) => ({ ...d, unlocked: true, plan: pl || 'year', planAt: Date.now() }));
      success();
      setTimeout(() => setToast({ title: 'Vítej v TAKE.IT Plus 💜', body: 'Seznam je odemčený. Klepni na věc a dej „Mám zájem“.' }), 600);
    },
    decline: (rid) => setRequests((rs) => rs.map((x) => (x.id === rid ? { ...x, status: 'declined' } : x))),
    markGiven: (id) => {
      setMyItems((xs) => xs.map((x) => (x.id === id ? { ...x, status: 'given' } : x)));
      setPoints((p) => p + 100);
      success();
      setToast({ title: 'Předáno ✅ +100 ⭐', body: 'Díky, že posíláš věci dál! Odemkl sis odznak Dobrý soused 🤝' });
    },
    deleteItem: (id) => {
      setMyItems((xs) => xs.filter((x) => x.id !== id));
      setRequests((rs) => rs.filter((r) => r.itemId !== id));
    },
    requestItem: (item, msg) => {
      setOutReq((o) => ({ ...o, [item.t]: 'pending' }));
      success();
      later(() => {
        setOutReq((o) => ({ ...o, [item.t]: 'accepted' }));
        success();
        notify(`${item.t} je tvoje! 🎉`, 'Dárce potvrdil tvoji žádost – kontakt je odemčený. Domluvte si vyzvednutí.', { type: 'accepted' });
      }, 6000);
    },
  };

  const restart = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setData({});
    setPoints(0);
    setMyItems([]);
    setRequests([]);
    setOutReq({});
    setAddOpen(false);
    setTab('home');
    setRoute('welcome');
  };

  let screen;
  if (route === 'welcome') screen = <Welcome onStart={() => setRoute('intro')} />;
  else if (route === 'intro') screen = <Intro onPick={setRoute} />;
  else if (route === 'give')
    screen = <Flow key="give" steps={GIVE_STEPS} ctx={ctx} onExit={() => setRoute('intro')} onFinish={() => setRoute('given')} />;
  else if (route === 'given')
    screen = (
      <Given
        ctx={ctx}
        onContinue={() => {
          setTab(myItems.length ? 'mine' : 'home');
          setRoute('main');
        }}
        onRestart={restart}
      />
    );
  else if (route === 'take')
    screen = (
      <Flow
        key="take"
        steps={TAKE_STEPS}
        ctx={ctx}
        onExit={() => setRoute('intro')}
        onFinish={() => {
          setTab('home');
          setRoute('main');
        }}
      />
    );
  else screen = <MainApp ctx={ctx} onRestart={restart} />;

  return (
    <View style={{ flex: 1 }}>
      <StatusBar barStyle="dark-content" />
      {screen}
      <AddItemModal ctx={ctx} />
      <Toast
        toast={toast}
        onHide={() => setToast(null)}
        onPress={() => {
          if (toast && toast.data && toast.data.type === 'request') ctx.openInbox();
          setToast(null);
        }}
      />
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
  label: { fontSize: 15, fontWeight: '800', color: INK, marginTop: 16, marginBottom: 8 },
  inputSm: { paddingVertical: 12, fontSize: 16, marginTop: 10 },
  addPhoto: { width: 78, height: 78, borderRadius: 16, borderWidth: 2, borderStyle: 'dashed', borderColor: '#D4D4D8', alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  smallThumb: { width: 78, height: 78, borderRadius: 16, marginRight: 8 },
  coverTag: { position: 'absolute', left: 6, bottom: 6, backgroundColor: B, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  chipSm: { paddingVertical: 9, paddingHorizontal: 11, borderRadius: 18, backgroundColor: CARD, marginRight: 6 },
  chipSmTxt: { fontSize: 13, fontWeight: '700', color: INK },
  contactCircle: { width: 58, height: 58, borderRadius: 29, borderWidth: 2, borderColor: '#ECECF0', backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: CARD, borderRadius: 16, paddingHorizontal: 14, height: 46 },
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
  metaChip: { backgroundColor: CARD, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6, marginRight: 8, marginBottom: 8 },
  metaTxt: { fontWeight: '700', color: INK, fontSize: 13 },
  donorCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: CARD, borderRadius: 20, padding: 14, marginTop: 14 },
  verified: { backgroundColor: B_LIGHT, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4 },
  miniMap: { height: 150, borderRadius: 20, overflow: 'hidden' },
  stickyFooter: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 30, borderTopWidth: 1, borderTopColor: '#EFEFF2', backgroundColor: '#fff' },
  optCheck: { position: 'absolute', right: 16, top: '50%', marginTop: 1, width: 22, height: 22, borderRadius: 11, backgroundColor: B, alignItems: 'center', justifyContent: 'center' },
  pointsPill: { backgroundColor: B_LIGHT, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 5 },
  floatCard: { position: 'absolute', width: 126, backgroundColor: '#fff', borderRadius: 18, padding: 8, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 6 },
  rewardRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: CARD, borderRadius: 20, padding: 14, marginBottom: 12 },
  rewardIcon: { width: 54, height: 54, borderRadius: 16, backgroundColor: B_LIGHT, alignItems: 'center', justifyContent: 'center' },
  badgeBox: { width: (W - 48 - 24) / 4, backgroundColor: CARD, borderRadius: 16, paddingVertical: 12, alignItems: 'center', marginBottom: 8 },
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
  tabAdd: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: B,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 6,
    marginTop: -26,
    shadowColor: B,
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
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
  section: { fontSize: 20, fontWeight: '800', color: INK, marginTop: 22, marginBottom: 6 },
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
