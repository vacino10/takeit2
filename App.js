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
if (Platform.OS !== 'web') {
  try {
    const maps = require('react-native-maps');
    MapView = maps.default;
    Marker = maps.Marker;
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
const ITEMS = ITEMS_RAW.map((it) => ({ ...it, v: VALUES[it.t] || 500, demo: true, contact: DEMO_CONTACT, d: 'Ve velmi dobrém stavu, vyzvednutí po domluvě.', chip: 'U dveří' }));

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
  { id: 'messenger', label: 'Messenger', e: '⚡', color: '#0084FF', field: 'messenger' },
  { id: 'phone', label: 'Zavolat', e: '📞', color: '#34C759', field: 'phone' },
  { id: 'sms', label: 'SMS', e: '✉️', color: '#FF9500', field: 'phone' },
  { id: 'email', label: 'E-mail', e: '📧', color: '#5E5CE6', field: 'email' },
];

const DEMO_CONTACT = { methods: ['whatsapp', 'phone'], phone: '', messenger: '', email: '' };

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
  if (method === 'messenger') url = `https://m.me/${(c.messenger || '').trim().replace(/^@/, '')}`;
  if (method === 'phone') url = `tel:${digits}`;
  if (method === 'sms') url = Platform.OS === 'ios' ? `sms:${digits}&body=${enc}` : `sms:${digits}?body=${enc}`;
  if (method === 'email') url = `mailto:${(c.email || '').trim()}?subject=${encodeURIComponent('TAKE.IT – ' + item.t)}&body=${enc}`;
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
  return (
    <FadeIn delay={delay}>
      <Pressable
        onPress={() => {
          tap();
          onPress();
        }}
        style={({ pressed }) => [
          st.option,
          selected && st.optionSel,
          pressed && { transform: [{ scale: 0.98 }] },
        ]}
      >
        <Text style={[st.optionTxt, selected && { color: B }]}>
          {emoji ? emoji + '  ' : ''}
          {label}
        </Text>
      </Pressable>
    </FadeIn>
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

function ItemCard({ item, i = 0, onPress }) {
  const size = (W - 48 - 12) / 2;
  return (
    <FadeIn delay={Math.min(i, 8) * 60} style={{ width: size, marginBottom: 12 }}>
      <Pressable onPress={onPress} style={st.itemCard}>
        <LinearGradient colors={item.g} style={{ height: size * 0.9, alignItems: 'center', justifyContent: 'center' }}>
          {item.uri ? (
            <Image source={{ uri: item.uri }} style={StyleSheet.absoluteFill} />
          ) : (
            <Text style={{ fontSize: size * 0.34 }}>{item.e}</Text>
          )}
          <View style={st.freeBadge}>
            <Text style={[st.freeBadgeTxt, item.badgeColor && { color: item.badgeColor }]}>{item.badge || 'ZDARMA'}</Text>
          </View>
        </LinearGradient>
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
  const next = () => (i < steps.length - 1 ? setI(i + 1) : onFinish());
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
        </View>
      )}
      <View key={i} style={{ flex: 1 }}>
        <Step next={next} ctx={ctx} />
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

function NeighborsMap({ next }) {
  return (
    <View style={{ flex: 1 }}>
      {MapView ? (
        <MapView
          style={StyleSheet.absoluteFill}
          initialRegion={{ latitude: 50.083, longitude: 14.43, latitudeDelta: 0.07, longitudeDelta: 0.07 }}
          scrollEnabled={false}
          zoomEnabled={false}
        >
          {PINS.map((p, i) => (
            <Marker key={i} coordinate={p}>
              <PinBubble />
            </Marker>
          ))}
        </MapView>
      ) : (
        <LinearGradient colors={['#EEF6E8', '#DCEFD3']} style={StyleSheet.absoluteFill}>
          {PINS.map((p, i) => (
            <View key={i} style={{ position: 'absolute', left: 30 + ((i * 97) % (W - 140)), top: 180 + i * 70 }}>
              <PinBubble />
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

function NotifyStep({ next, ctx, msg }) {
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
        <Animated.View
          style={[
            st.notif,
            {
              opacity: drop,
              transform: [{ translateY: drop.interpolate({ inputRange: [0, 1], outputRange: [-30, 0] }) }],
            },
          ]}
        >
          <AppIcon size={44} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontWeight: '700', color: SUB }}>TAKE.IT</Text>
              <Text style={{ color: SUB }}>teď</Text>
            </View>
            <Text style={{ fontSize: 15, color: INK, marginTop: 2 }}>{msg}</Text>
          </View>
        </Animated.View>
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

const NotifyGive = (p) => <NotifyStep {...p} msg="Petr si chce vyzvednout tvoji lampu. Domluvte se 👋" />;
const NotifyTake = (p) => <NotifyStep {...p} msg="Kousek od tebe se právě objevil retro gramofon zdarma!" />;

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
  const [methods, setMethods] = useState(saved.methods || ['whatsapp']);
  const [phone, setPhone] = useState(saved.phone || '+420 ');
  const [messenger, setMessenger] = useState(saved.messenger || '');
  const [email, setEmail] = useState(saved.email || '');
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
  const needEmail = methods.includes('email');
  const phoneOk = !needPhone || phone.replace(/[^0-9]/g, '').length >= 9;
  const messengerOk = !needMessenger || messenger.trim().length >= 2;
  const emailOk = !needEmail || /.+@.+\..+/.test(email.trim());
  const valid = title.trim() && methods.length > 0 && phoneOk && messengerOk && emailOk;
  const chips = [['🚪', 'U dveří'], ['🕒', 'Kdykoli dnes'], ['📦', 'Před domem']];
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 20 }} keyboardShouldPersistTaps="handled">
        <FadeIn>
          <Text style={st.h1}>{heading}</Text>
          <Text style={st.sub}>Přidej ji teď – sousedé v okolí ji uvidí hned.</Text>
        </FadeIn>
        <Pressable onPress={pick} style={st.photoBox}>
          {photos.length ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {photos.map((u) => (
                <Image key={u} source={{ uri: u }} style={st.photoThumb} />
              ))}
              {photos.length < 5 ? (
                <View style={[st.photoThumb, { alignItems: 'center', justifyContent: 'center', backgroundColor: '#EEE' }]}>
                  <Text style={{ fontSize: 30, color: SUB }}>+</Text>
                </View>
              ) : null}
            </ScrollView>
          ) : (
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 44 }}>📷</Text>
              <Text style={[st.h2, { marginTop: 8 }]}>Přidat fotky</Text>
              <Text style={st.chartAxis}>Až 5 fotek</Text>
            </View>
          )}
        </Pressable>
        <TextInput value={title} onChangeText={setTitle} placeholder="Co daruješ?" placeholderTextColor="#B5B5BA" style={st.input} />
        <TextInput
          value={desc}
          onChangeText={setDesc}
          placeholder="Pár detailů – velikost, stav, poznámka k vyzvednutí…"
          placeholderTextColor="#B5B5BA"
          style={[st.input, { height: 100, textAlignVertical: 'top' }]}
          multiline
        />
        <Text style={st.section}>Vyzvednutí</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {chips.map(([e, l]) => (
            <Pressable
              key={l}
              onPress={() => {
                tap();
                setChip(l);
              }}
              style={[st.chip, chip === l && st.chipSel]}
            >
              <Text style={[st.chipTxt, chip === l && { color: '#fff' }]}>{e} {l}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={st.section}>Jak tě můžou kontaktovat?</Text>
        <Text style={st.chartAxis}>Vyber jednu nebo víc možností.</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 }}>
          {CONTACTS.map((c) => {
            const on = methods.includes(c.id);
            return (
              <Pressable
                key={c.id}
                onPress={() => {
                  tap();
                  toggle(c.id);
                }}
                style={[st.contactTile, on && { borderColor: c.color, backgroundColor: c.color + '14' }]}
              >
                <Text style={{ fontSize: 26 }}>{c.e}</Text>
                <Text style={[st.contactTxt, on && { color: INK }]}>{c.label}</Text>
                {on ? (
                  <View style={[st.contactCheck, { backgroundColor: c.color }]}>
                    <Text style={{ color: '#fff', fontSize: 11, fontWeight: '900' }}>✓</Text>
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </View>
        {needPhone ? (
          <FadeIn>
            <TextInput
              value={phone}
              onChangeText={setPhone}
              placeholder="Telefonní číslo"
              placeholderTextColor="#B5B5BA"
              keyboardType="phone-pad"
              style={[st.input, !phoneOk && phone.length > 5 && st.inputErr]}
            />
          </FadeIn>
        ) : null}
        {needMessenger ? (
          <FadeIn>
            <TextInput
              value={messenger}
              onChangeText={setMessenger}
              placeholder="Uživatelské jméno na Facebooku (m.me/…)"
              placeholderTextColor="#B5B5BA"
              autoCapitalize="none"
              autoCorrect={false}
              style={st.input}
            />
          </FadeIn>
        ) : null}
        {needEmail ? (
          <FadeIn>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="E-mail"
              placeholderTextColor="#B5B5BA"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              style={[st.input, !emailOk && email.length > 3 && st.inputErr]}
            />
          </FadeIn>
        ) : null}
        <Text style={[st.chartAxis, { marginTop: 10 }]}>🔒 Kontakt uvidí jen lidé, kteří o věc projeví zájem.</Text>
      </ScrollView>
      <View style={{ paddingHorizontal: 24 }}>
        {hideSkip ? null : (
          <Pressable onPress={next} hitSlop={10}>
            <Text style={st.secondary}>Udělám to později</Text>
          </Pressable>
        )}
        <Button
          title="Zveřejnit"
          disabled={!valid}
          onPress={() => {
            const contact = { methods, phone: phone.trim(), messenger: messenger.trim(), email: email.trim() };
            ctx.set('savedContact', contact);
            ctx.addItem({
              t: title.trim(),
              d: desc.trim(),
              uri: photos[0],
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

function ItemDetail({ item, onClose, ctx }) {
  const [asking, setAsking] = useState(false);
  const [msg, setMsg] = useState('Ahoj, můžu si to vyzvednout dnes večer?');
  useEffect(() => setAsking(false), [item && item.t]);
  if (!item) return null;
  const own = !item.demo;
  const status = ctx.outReq[item.t];
  const methods = (item.contact && item.contact.methods) || [];
  const incoming = ctx.requests.filter((r) => r.itemId === item.id);
  const pending = incoming.filter((r) => r.status === 'pending').length;
  return (
    <Modal visible={!!item} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1, backgroundColor: '#fff' }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ paddingBottom: 30 }} keyboardShouldPersistTaps="handled">
          <LinearGradient colors={item.g} style={{ height: 300, alignItems: 'center', justifyContent: 'center' }}>
            {item.uri ? <Image source={{ uri: item.uri }} style={StyleSheet.absoluteFill} /> : <Text style={{ fontSize: 120 }}>{item.e}</Text>}
            <Pressable onPress={onClose} hitSlop={12} style={st.closeBtn}>
              <Text style={{ fontSize: 22, color: INK }}>✕</Text>
            </Pressable>
          </LinearGradient>
          <View style={{ padding: 24 }}>
            <Text style={st.h1}>{item.t}</Text>
            <Text style={{ color: GREEN, fontWeight: '900', fontSize: 22, marginTop: 6 }}>Zdarma</Text>
            <Text style={[st.sub, { marginTop: 10 }]}>📍 {own ? 'Praha • právě teď' : `${item.km} km • před ${item.m} min`}</Text>
            {item.chip ? <Text style={st.sub}>🚪 Vyzvednutí: {item.chip}</Text> : null}
            {item.d ? <Text style={[st.body, { marginTop: 16 }]}>{item.d}</Text> : null}

            {own ? (
              <View style={[st.chartCard, { marginTop: 26 }]}>
                <Text style={st.h2}>Tohle je tvoje věc</Text>
                <Text style={st.chartAxis}>
                  {item.status === 'given'
                    ? '✅ Předáno – díky, že posíláš věci dál!'
                    : item.status === 'reserved'
                    ? '🤝 Rezervováno – zájemce dostal tvůj kontakt.'
                    : incoming.length
                    ? `Zájemci: ${incoming.length}${pending ? ` • čeká na tebe ${pending}` : ''}`
                    : 'Zatím se nikdo nehlásil. Jakmile ano, přijde ti upozornění.'}
                </Text>
                {pending ? (
                  <Button
                    title={`Zobrazit zájemce (${pending})`}
                    style={{ marginTop: 14, marginBottom: 0 }}
                    onPress={() => {
                      onClose();
                      ctx.openInbox();
                    }}
                  />
                ) : null}
                {item.status === 'reserved' ? (
                  <Button
                    title="Označit jako předané ✅"
                    style={{ marginTop: 14, marginBottom: 0 }}
                    onPress={() => {
                      ctx.markGiven(item.id);
                      onClose();
                    }}
                  />
                ) : null}
                {item.status !== 'given' ? (
                  <Pressable
                    onPress={() => {
                      ctx.deleteItem(item.id);
                      onClose();
                    }}
                    hitSlop={10}
                  >
                    <Text style={[st.secondary, { marginTop: 16, marginBottom: 0, color: '#FF3B30' }]}>Smazat inzerát</Text>
                  </Pressable>
                ) : null}
              </View>
            ) : status === 'accepted' ? (
              <View style={{ marginTop: 26 }}>
                <View style={[st.statusCard, { backgroundColor: '#DDF7E5' }]}>
                  <Text style={st.h2}>✅ Dárce potvrdil – je to tvoje!</Text>
                  <Text style={st.chartAxis}>Kontakt je odemčený. Domluvte si vyzvednutí.</Text>
                </View>
                {CONTACTS.filter((c) => methods.includes(c.id)).map((c, i) => (
                  <FadeIn key={c.id} delay={i * 60}>
                    <Pressable
                      onPress={() => {
                        tap();
                        openContact(c.id, item);
                      }}
                      style={({ pressed }) => [st.contactBtn, { backgroundColor: c.color }, pressed && { opacity: 0.85 }]}
                    >
                      <Text style={{ fontSize: 20 }}>{c.e}</Text>
                      <Text style={st.contactBtnTxt}>
                        {c.id === 'phone' ? 'Zavolat' : c.id === 'email' ? 'Napsat e-mail' : `Napsat přes ${c.label}`}
                      </Text>
                    </Pressable>
                  </FadeIn>
                ))}
              </View>
            ) : status === 'pending' ? (
              <View style={[st.statusCard, { marginTop: 26 }]}>
                <ActivityIndicator color={B} />
                <Text style={[st.h2, { marginTop: 10, textAlign: 'center' }]}>Čekáme na potvrzení dárce…</Text>
                <Text style={[st.chartAxis, { textAlign: 'center' }]}>Jakmile potvrdí, přijde ti upozornění a odemkne se kontakt.</Text>
              </View>
            ) : asking ? (
              <FadeIn style={{ marginTop: 26 }}>
                <Text style={st.section}>Zpráva pro dárce</Text>
                <TextInput value={msg} onChangeText={setMsg} multiline style={[st.input, { height: 90, textAlignVertical: 'top' }]} />
                <Button
                  title="Odeslat žádost"
                  style={{ marginTop: 14 }}
                  disabled={!msg.trim()}
                  onPress={() => ctx.requestItem(item, msg.trim())}
                />
              </FadeIn>
            ) : (
              <View style={{ marginTop: 26 }}>
                <Button title="🙋  Mám zájem" onPress={() => setAsking(true)} />
                <Text style={[st.chartAxis, { textAlign: 'center' }]}>
                  🔒 Kontakt na dárce se odemkne, až potvrdí tvoji žádost.
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
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

const SetupGiveWrap = SetupGive;
const GIVE_STEPS = [GiveReason, GiveImpact, GivePickup, NeighborsMap, GiveSpeed, DonorPerks, NotifyGive, SetupGiveWrap, FirstItem];

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
                  <Text style={{ color: '#fff', fontWeight: '800' }}>🎁 Sleva pro dárce −{discount} % je započítaná</Text>
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

function LockedOverlay({ ctx, onUnlock, onSkip }) {
  const sheet = useRef(new Animated.Value(0)).current;
  const marquee = useRef(new Animated.Value(0)).current;
  const glow = useRef(new Animated.Value(0)).current;
  const [idx, setIdx] = useState(0);
  const fade = useRef(new Animated.Value(1)).current;
  const disc = discountFor(ctx.myItems.length);
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
      <BlurView intensity={30} tint="light" experimentalBlurMethod="dimezisBlurView" style={StyleSheet.absoluteFill} />
      <LinearGradient colors={['rgba(255,255,255,0)', 'rgba(112,40,232,0.18)']} style={StyleSheet.absoluteFill} pointerEvents="none" />
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
        <Text style={[st.sub, { textAlign: 'center' }]}>Nové přibývají každou hodinu. Odemkni seznam a buď u nich první.</Text>
        <View style={{ height: 64, overflow: 'hidden', marginTop: 16, marginHorizontal: -24 }}>
          <Animated.View
            style={{ flexDirection: 'row', transform: [{ translateX: marquee.interpolate({ inputRange: [0, 1], outputRange: [0, -rowW] }) }] }}
          >
            {row.map((x, i) => (
              <LinearGradient key={i} colors={x.g} style={st.marqueeChip}>
                <Text style={{ fontSize: 26 }}>{x.e}</Text>
              </LinearGradient>
            ))}
          </Animated.View>
        </View>
        {disc ? (
          <View style={[st.discountPill, { alignSelf: 'center', marginTop: 14 }]}>
            <Text style={{ color: '#fff', fontWeight: '800' }}>🎁 Máš slevu −{disc} % jako dárce</Text>
          </View>
        ) : (
          <Text style={[st.chartAxis, { textAlign: 'center', marginTop: 12 }]}>💡 Daruj věc a získáš slevu až −60 %</Text>
        )}
        <Animated.View style={{ marginTop: 16, transform: [{ scale: glow.interpolate({ inputRange: [0, 1], outputRange: [1, 1.03] }) }] }}>
          <Button title="Odemknout seznam" onPress={onUnlock} style={{ marginBottom: 0 }} />
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
          <Grid items={ITEMS.slice(0, 8)} />
        </View>
        <LockedOverlay ctx={ctx} onUnlock={() => setPay(true)} onSkip={next} />
      </View>
      <Paywall
        visible={pay}
        discount={discountFor(ctx.myItems.length)}
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

const TAKE_STEPS = [TakeCategories, TakeSavings, TakeCompare, TakeDistance, NotifyTake, SetupTake, LockedFeed];

// ---------- Hlavní appka (záložky) ----------
function Header({ title, right }) {
  return (
    <View style={st.feedHeader}>
      {title ? <Text style={[st.h1, { fontSize: 30 }]}>{title}</Text> : <Logo size={30} />}
      {right}
    </View>
  );
}

function HomeTab({ ctx }) {
  const [open, setOpen] = useState(null);
  const [pay, setPay] = useState(false);
  const own = ctx.myItems
    .filter((x) => x.status !== 'given')
    .map((x) => ({ ...x, badge: x.status === 'reserved' ? 'REZERVOVÁNO' : 'TVOJE', badgeColor: x.status === 'reserved' ? '#FF9500' : B }));
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
  const disc = discountFor(ctx.myItems.length);
  return (
    <View style={{ flex: 1 }}>
      <Header />
      {ctx.data.unlocked ? (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 30 }}>
          <Text style={[st.h2, { marginBottom: 4 }]}>Zdarma kolem tebe</Text>
          <Text style={[st.chartAxis, { marginBottom: 14 }]}>Praha • do {ctx.data.km || 5} km</Text>
          <Grid
            items={items}
            onItem={(it) => {
              tap();
              setOpen(it);
            }}
          />
        </ScrollView>
      ) : (
        <View style={{ flex: 1, overflow: 'hidden' }}>
          <View style={{ paddingHorizontal: 24 }} pointerEvents="none">
            <Grid items={ITEMS.slice(0, 8)} />
          </View>
          <LockedOverlay ctx={ctx} onUnlock={() => setPay(true)} />
        </View>
      )}
      <ItemDetail item={current} onClose={() => setOpen(null)} ctx={ctx} />
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
              <View style={st.avatar}>
                <Text style={{ fontSize: 24 }}>{it ? it.e : '🎁'}</Text>
              </View>
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
  const disc = discountFor(given);
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
                <LinearGradient colors={x.g} style={[st.avatar, { borderRadius: 14 }]}>
                  <Text style={{ fontSize: 24 }}>{x.e}</Text>
                </LinearGradient>
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
            {disc ? `Tvoje sleva pro dárce: −${disc} %` : 'Daruj první věc a získáš −20 %'}
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
              {c.messenger ? <Text style={st.chartAxis}>⚡ m.me/{c.messenger}</Text> : null}
              {c.email ? <Text style={st.chartAxis}>📧 {c.email}</Text> : null}
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
  const [route, setRoute] = useState('intro');
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
      success();
      setToast({ title: 'Předáno ✅', body: 'Díky, že posíláš věci dál! 💜' });
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
    setMyItems([]);
    setRequests([]);
    setOutReq({});
    setAddOpen(false);
    setTab('home');
    setRoute('intro');
  };

  let screen;
  if (route === 'intro') screen = <Intro onPick={setRoute} />;
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
