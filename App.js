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
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
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

const ITEMS = ITEMS_RAW.map((it) => ({ ...it, demo: true, contact: DEMO_CONTACT, d: 'Ve velmi dobrém stavu, vyzvednutí po domluvě.', chip: 'U dveří' }));

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
            <Text style={st.freeBadgeTxt}>ZDARMA</Text>
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
      onNext={() => {
        ctx.set('notify', v);
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

function FirstItem({ next, ctx }) {
  const [photos, setPhotos] = useState([]);
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [chip, setChip] = useState('U dveří');
  const [methods, setMethods] = useState(['whatsapp']);
  const [phone, setPhone] = useState('+420 ');
  const [messenger, setMessenger] = useState('');
  const [email, setEmail] = useState('');
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
          <Text style={st.h1}>Daruj svou první věc</Text>
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
        <Pressable onPress={next} hitSlop={10}>
          <Text style={st.secondary}>Udělám to později</Text>
        </Pressable>
        <Button
          title="Zveřejnit"
          disabled={!valid}
          onPress={() => {
            ctx.set('item', {
              t: title.trim(),
              d: desc.trim(),
              uri: photos[0],
              chip,
              e: '🎁',
              km: '0',
              m: 0,
              g: [B_LIGHT, '#DCCFFF'],
              contact: { methods, phone: phone.trim(), messenger: messenger.trim(), email: email.trim() },
            });
            success();
            next();
          }}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

function ItemDetail({ item, onClose }) {
  if (!item) return null;
  const methods = (item.contact && item.contact.methods) || [];
  return (
    <Modal visible={!!item} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: '#fff' }}>
        <ScrollView contentContainerStyle={{ paddingBottom: 30 }}>
          <LinearGradient colors={item.g} style={{ height: 320, alignItems: 'center', justifyContent: 'center' }}>
            {item.uri ? <Image source={{ uri: item.uri }} style={StyleSheet.absoluteFill} /> : <Text style={{ fontSize: 120 }}>{item.e}</Text>}
            <Pressable onPress={onClose} hitSlop={12} style={st.closeBtn}>
              <Text style={{ fontSize: 22, color: INK }}>✕</Text>
            </Pressable>
          </LinearGradient>
          <View style={{ padding: 24 }}>
            <Text style={st.h1}>{item.t}</Text>
            <Text style={{ color: GREEN, fontWeight: '900', fontSize: 22, marginTop: 6 }}>Zdarma</Text>
            <Text style={[st.sub, { marginTop: 10 }]}>📍 {item.km === '0' ? 'Praha • právě teď' : `${item.km} km • před ${item.m} min`}</Text>
            {item.chip ? <Text style={st.sub}>🚪 Vyzvednutí: {item.chip}</Text> : null}
            {item.d ? <Text style={[st.body, { marginTop: 16 }]}>{item.d}</Text> : null}
            <Text style={[st.section, { marginTop: 26 }]}>Kontaktuj dárce</Text>
            {methods.length === 0 ? <Text style={st.chartAxis}>Dárce nezadal kontakt.</Text> : null}
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
            <Text style={[st.chartAxis, { textAlign: 'center', marginTop: 12 }]}>
              Zpráva se předvyplní – stačí ji odeslat.
            </Text>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const GIVE_STEPS = [GiveReason, GiveImpact, GivePickup, NeighborsMap, GiveSpeed, NotifyGive, SetupGive, FirstItem];

function Given({ ctx, onBrowse, onRestart }) {
  const item = ctx.data.item;
  return (
    <SafeAreaView style={st.safe} edges={['top', 'bottom']}>
      <View style={{ flex: 1, paddingHorizontal: 24, justifyContent: 'center' }}>
        <FadeIn style={{ alignItems: 'center' }}>
          <Text style={{ fontSize: 64 }}>🎉</Text>
          <Text style={[st.h1, { textAlign: 'center' }]}>{item ? 'Tvoje věc je venku!' : 'Vše nastaveno!'}</Text>
          <Text style={[st.sub, { textAlign: 'center' }]}>
            {item ? 'Dáme ti vědět, jakmile si o ni někdo řekne.' : 'Věc můžeš přidat kdykoli tlačítkem + Darovat.'}
          </Text>
        </FadeIn>
        {item ? (
          <FadeIn delay={250} style={[st.itemCard, { marginTop: 28, flexDirection: 'row', alignItems: 'center' }]}>
            <LinearGradient colors={item.g} style={{ width: 96, height: 96, alignItems: 'center', justifyContent: 'center' }}>
              {item.uri ? <Image source={{ uri: item.uri }} style={StyleSheet.absoluteFill} /> : <Text style={{ fontSize: 40 }}>{item.e}</Text>}
            </LinearGradient>
            <View style={{ padding: 14, flex: 1 }}>
              <Text style={st.itemTitle}>{item.t}</Text>
              <Text style={{ color: GREEN, fontWeight: '800', marginTop: 4 }}>Zdarma</Text>
              <Text style={st.itemMeta}>Praha • právě teď • {item.chip}</Text>
              {item.contact ? (
                <Text style={st.itemMeta}>
                  Kontakt: {CONTACTS.filter((c) => item.contact.methods.includes(c.id)).map((c) => c.e).join(' ')}
                </Text>
              ) : null}
            </View>
          </FadeIn>
        ) : null}
      </View>
      <View style={{ paddingHorizontal: 24 }}>
        <Button title="Prohlédnout věci zdarma" onPress={onBrowse} />
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

function Paywall({ visible, onClose, onUnlock }) {
  const [plan, setPlan] = useState('year');
  const [busy, setBusy] = useState(false);
  const plans = [
    { id: 'year', name: 'Roční', price: '499 Kč', note: '41 Kč měsíčně', badge: 'Nejvýhodnější' },
    { id: 'month', name: 'Měsíční', price: '99 Kč', note: 'měsíčně' },
    { id: 'week', name: 'Týdenní', price: '39 Kč', note: 'týdně' },
  ];
  const buy = () => {
    setBusy(true);
    setTimeout(() => {
      setBusy(false);
      success();
      onUnlock();
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
                  <Text style={[st.h2, { color: plan === p.id ? B : INK }]}>{p.price}</Text>
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

function LockedFeed({ next, ctx }) {
  const [pay, setPay] = useState(false);
  return (
    <View style={{ flex: 1 }}>
      <View style={{ paddingHorizontal: 24 }}>
        <FadeIn>
          <Text style={st.h1}>Našli jsme 37 věcí zdarma kolem tebe</Text>
          <Text style={st.sub}>Do {ctx.data.km || 5} km • přidáno za poslední hodinu</Text>
        </FadeIn>
      </View>
      <View style={{ flex: 1, marginTop: 16, overflow: 'hidden' }}>
        <View style={{ paddingHorizontal: 24 }} pointerEvents="none">
          <Grid items={ITEMS.slice(0, 8)} />
        </View>
        <BlurView intensity={28} tint="light" experimentalBlurMethod="dimezisBlurView" style={StyleSheet.absoluteFill} />
        <LinearGradient colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.95)']} style={[StyleSheet.absoluteFill, { top: '35%' }]} />
        <View style={st.lockCard}>
          <Text style={{ fontSize: 40 }}>🔒</Text>
          <Text style={[st.h2, { textAlign: 'center', marginTop: 6 }]}>Odemkni všechny věci</Text>
          <Text style={[st.chartAxis, { textAlign: 'center', marginTop: 4 }]}>Nové věci se rozeberou rychle – buď první.</Text>
        </View>
      </View>
      <View style={{ paddingHorizontal: 24 }}>
        <Button title="Odemknout TAKE.IT" onPress={() => setPay(true)} />
      </View>
      <Paywall
        visible={pay}
        onClose={() => setPay(false)}
        onUnlock={() => {
          setPay(false);
          ctx.set('unlocked', true);
          next();
        }}
      />
    </View>
  );
}

const TAKE_STEPS = [TakeCategories, TakeSavings, TakeCompare, TakeDistance, NotifyTake, SetupTake, LockedFeed];

// ---------- Hlavní feed ----------
function Feed({ ctx, onGive, onRestart }) {
  const items = ctx.data.item ? [ctx.data.item, ...ITEMS] : ITEMS;
  const [open, setOpen] = useState(null);
  return (
    <SafeAreaView style={st.safe} edges={['top']}>
      <View style={st.feedHeader}>
        <Logo size={30} />
        <Pressable onPress={onRestart} hitSlop={10}>
          <Text style={{ color: SUB, fontWeight: '600' }}>Reset</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 120 }}>
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
      <ItemDetail item={open} onClose={() => setOpen(null)} />
      <Pressable
        onPress={() => {
          tap();
          onGive();
        }}
        style={st.fab}
      >
        <Text style={{ color: '#fff', fontWeight: '800', fontSize: 17 }}>＋ Darovat</Text>
      </Pressable>
    </SafeAreaView>
  );
}

// ---------- App ----------
export default function App() {
  const [route, setRoute] = useState('intro');
  const [data, setData] = useState({});
  const ctx = { data, set: (k, v) => setData((d) => ({ ...d, [k]: v })) };
  const restart = () => {
    setData({});
    setRoute('intro');
  };

  let screen;
  if (route === 'intro') screen = <Intro onPick={setRoute} />;
  else if (route === 'give')
    screen = <Flow key="give" steps={GIVE_STEPS} ctx={ctx} onExit={() => setRoute('intro')} onFinish={() => setRoute('given')} />;
  else if (route === 'given')
    screen = <Given ctx={ctx} onBrowse={() => setRoute(data.unlocked ? 'feed' : 'take')} onRestart={restart} />;
  else if (route === 'take')
    screen = <Flow key="take" steps={TAKE_STEPS} ctx={ctx} onExit={() => setRoute('intro')} onFinish={() => setRoute('feed')} />;
  else screen = <Feed ctx={ctx} onGive={() => setRoute('give')} onRestart={restart} />;

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" />
      {screen}
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
