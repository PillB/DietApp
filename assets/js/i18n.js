'use strict';
// P6 — i18n for the four engine panels (planner / shopping / cook / flavor).
// Six locales: en, es-PE, zh-Hans, hi, de, ja. Dictionary completeness is
// test-enforced (tests/i18n.test.cjs): every key must exist in EVERY locale —
// missing keys are a failure, never a silent fallback. Safety texts in recipes
// remain reviewed-content (not machine-translated) per handover §9.
// Browser (window.I18N) + Node (module.exports). CC ≤ 12 per function.
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.I18N = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const LOCALES = ['en', 'es-PE', 'zh-Hans', 'hi', 'de', 'ja'];

  const DICT = {
    'planner.title': { 'en': 'Planner (development preview)', 'es-PE': 'Planificador (versión de desarrollo)', 'zh-Hans': '计划器（开发预览）', 'hi': 'प्लानर (विकास पूर्वावलोकन)', 'de': 'Planer (Entwicklungsvorschau)', 'ja': 'プランナー（開発プレビュー）' },
    'planner.keyboardNote': { 'en': 'Keyboard-first: Tab reaches every entry; buttons do exactly what they say. No drag.', 'es-PE': 'Primero el teclado: Tab llega a cada entrada; los botones hacen lo que dicen. Sin arrastre.', 'zh-Hans': '键盘优先：Tab 可到达每个条目；按钮言行一致。无拖拽。', 'hi': 'कीबोर्ड पहले: Tab हर एंट्री तक पहुँचता है; बटन वैसा ही करते हैं जैसा कहते हैं। ड्रैग नहीं।', 'de': 'Tastatur zuerst: Tab erreicht jeden Eintrag; Buttons tun, was sie sagen. Kein Drag.', 'ja': 'キーボード優先：Tabですべての項目に到達。ボタンは表示どおりに動作。ドラッグなし。' },
    'planner.weekBuilder': { 'en': 'Week builder (deficit week — structure only, kcal/macros pending composition)', 'es-PE': 'Constructor de semana (semana déficit — solo estructura; kcal/macros pendientes de composición)', 'zh-Hans': '周构建器（减重周—仅结构；热量/宏量待成分表）', 'hi': 'वीक बिल्डर (डेफ़िसिट सप्ताह — केवल संरचना; जेडीएफ/मैक्रो पेंडिंग)', 'de': 'Wochen-Builder (Defizitwoche — nur Struktur; kcal/Makros ausstehend)', 'ja': '週ビルダー（減量週—構造のみ；kcal/マクロは成分表待ち）' },
    'planner.dayTarget': { 'en': 'Day target', 'es-PE': 'Objetivo diario', 'zh-Hans': '每日目标', 'hi': 'दैनिक लक्ष्य', 'de': 'Tagesziel', 'ja': '1日の目標' },
    'planner.ackLabel': { 'en': 'I acknowledge below-1500 plans need clinician review', 'es-PE': 'Reconozco que los planes bajo 1500 requieren revisión clínica', 'zh-Hans': '我确认低于1500的计划需要临床复核', 'hi': 'मैं स्वीकार करता/करती हूँ कि 1500 से नीचे की योजनाओं को चिकित्सकीय समीक्षा चाहिए', 'de': 'Ich bestätige, dass Pläne unter 1500 einer ärztlichen Prüfung bedürfen', 'ja': '1500未満の計画には臨床レビューが必要であることを理解しています' },
    'planner.buildWeek': { 'en': 'Build week (Mon–Sun)', 'es-PE': 'Construir semana (lun–dom)', 'zh-Hans': '生成周计划（周一–周日）', 'hi': 'सप्ताह बनाएँ (सोम–रवि)', 'de': 'Woche bauen (Mo–So)', 'ja': '週を組み立てる（月–日）' },
    'planner.weekBuilt': { 'en': 'Week built for', 'es-PE': 'Semana construida para', 'zh-Hans': '已生成周计划：', 'hi': 'सप्ताह बना गया:', 'de': 'Woche gebaut für', 'ja': '週を作成：' },
    'planner.refused': { 'en': 'Refused:', 'es-PE': 'Rechazado:', 'zh-Hans': '已拒绝：', 'hi': 'अस्वीकृत:', 'de': 'Abgelehnt:', 'ja': '拒否：' },
    'shopping.title': { 'en': 'Shopping list — canonical engine (development preview)', 'es-PE': 'Lista de compras — motor canónico (versión de desarrollo)', 'zh-Hans': '购物清单—规范引擎（开发预览）', 'hi': 'शॉपिंग सूची — कैनोनिकल इंजन (विकास पूर्वावलोकन)', 'de': 'Einkaufsliste — kanonische Engine (Entwicklungsvorschau)', 'ja': '買い物リスト—正規エンジン（開発プレビュー）' },
    'shopping.note': { 'en': 'Exact-rational quantities from your plan; every store row is not checked (no stock or price claims). Grouped by food family; es-PE names shown with draft tag pending native review.', 'es-PE': 'Cantidades racionales exactas de tu plan; cada fila de tienda está sin verificar (sin reclamos de stock ni precio). Agrupado por familia; nombres es-PE con etiqueta borrador hasta revisión nativa.', 'zh-Hans': '来自你的计划的精确有理数量；每条商店行均未核实（无库存/价格声明）。按食物族群分组；es-PE 名称带草稿标签，待母语审校。', 'hi': 'आपकी योजना की सटीक तर्कसंगत मात्राएँ; हर स्टोर पंक्ति अनियंत्रित है (कोई स्टॉक/मूल्य दावा नहीं)। खाद्य परिवार द्वारा समूहीकृत; es-PE नाम मूल समीक्षा तक ड्राफ्ट टैग सहित।', 'de': 'Exakte rationale Mengen aus deinem Plan; jede Shop-Zeile ist ungeprüft (keine Bestand-/Preisangaben). Nach Lebensmittel-Familie gruppiert; es-PE-Namen mit Entwurfs-Tag bis zur Muttersprachler-Prüfung.', 'ja': 'あなたの計画からの正確な有理数量。すべてのストア行は未確認（在庫・価格の主張なし）。食材ファミリーごとにグループ化。es-PE名は母語レビューまでドラフトタグ付き。' },
    'shopping.recipe': { 'en': 'Recipe', 'es-PE': 'Receta', 'zh-Hans': '食谱', 'hi': 'व्यंजन', 'de': 'Rezept', 'ja': 'レシピ' },
    'shopping.date': { 'en': 'Date', 'es-PE': 'Fecha', 'zh-Hans': '日期', 'hi': 'तारीख', 'de': 'Datum', 'ja': '日付' },
    'shopping.portions': { 'en': 'Portions', 'es-PE': 'Porciones', 'zh-Hans': '份数', 'hi': 'भाग', 'de': 'Portionen', 'ja': '人数分' },
    'shopping.addEntry': { 'en': 'Add plan entry', 'es-PE': 'Agregar entrada al plan', 'zh-Hans': '添加计划条目', 'hi': 'योजना प्रविष्टि जोड़ें', 'de': 'Planeintrag hinzufügen', 'ja': '計画項目を追加' },
    'shopping.from': { 'en': 'From', 'es-PE': 'Desde', 'zh-Hans': '从', 'hi': 'से', 'de': 'Von', 'ja': '開始' },
    'shopping.to': { 'en': 'To', 'es-PE': 'Hasta', 'zh-Hans': '至', 'hi': 'तक', 'de': 'Bis', 'ja': '終了' },
    'shopping.copyCsv': { 'en': 'Copy CSV', 'es-PE': 'Copiar CSV', 'zh-Hans': '复制CSV', 'hi': 'CSV कॉपी करें', 'de': 'CSV kopieren', 'ja': 'CSVをコピー' },
    'shopping.printList': { 'en': 'Print list', 'es-PE': 'Imprimir lista', 'zh-Hans': '打印清单', 'hi': 'सूची प्रिंट करें', 'de': 'Liste drucken', 'ja': '印刷' },
    'cookmode.title': { 'en': 'Cook mode (development preview)', 'es-PE': 'Modo de cocción (versión de desarrollo)', 'zh-Hans': '烹饪模式（开发预览）', 'hi': 'कुक मोड (विकास पूर्णावलोकन)', 'de': 'Kochmodus (Entwicklungsvorschau)', 'ja': 'クックモード（開発プレビュー）' },
    'nutrition.missingRows': { 'en': 'ingredient row(s) without composition', 'es-PE': 'ingrediente(s) sin composición', 'zh-Hans': '没有成分数据的食材行', 'hi': 'बिना संरचना डेटा वाली घटक पंक्तियाँ', 'de': 'Zutatenzeile(n) ohne Zusammensetzung', 'ja': '成分データのない食材行' },
    'nutrition.perServing': { 'en': 'Per serving (computed-pending-weighin):', 'es-PE': 'Por porción (cálculo estimado — pendiente de pesa en cocina):', 'zh-Hans': '每份（计算值-待厨房称重）：', 'hi': 'प्रति सर्विंग (गणना-किचन वजन लंबित):', 'de': 'Pro Portion (berechnet — Haushaltswägung ausstehend):', 'ja': '1人分（計算値、キッチン計量待ち）：' },
    'cookmode.subtitle': { 'en': "Step cards with gate verdicts. Temperature claims are extracted from prose (unverified); food-type is inferred and labeled; thermometer checkpoints are required for protein steps before anything is EVER 'validated'.", 'es-PE': "Tarjetas de paso con veredictos. Las temperaturas del texto son afirmaciones extraídas (sin verificar); el tipo de alimento se infiere y etiqueta; las verificaciones de termómetro son exigidas para pasos de proteína antes de que algo sea 'validado'.", 'zh-Hans': '步骤卡带门槛判定。正文中的温度为提取声明(未核实)；食材类型为推断并标注；蛋白步骤在"已验证"前必须使用温度计校验。', 'hi': 'स्टेप कार्ड में गेट वर्डिक्ट हैं। गद्य से निकाले गए तापमान लाभ (असत्यापित); खाद्य प्रकार अनुमानित-लेबल्ड; प्रोटीन स्टेप्स के लिए थर्मामीटर चेकपॉइंट अनिवार्य, तब तक कुछ भी सत्यापित नहीं।', 'de': "Schrittkarten mit Gate-Urteilen. Temperaturen aus dem Fließtext sind EXTRAKTIONEN (unbestätigt); die Lebensmittelklasse ist gezeichnet und markiert; Thermometer-Checkpoint ist für Protein-Schritte Pflicht, bevor irgendetwas 'validiert' ist.", 'ja': 'ステップカードにゲート判定。本文から抽出した温度は主張(未検証)；食材種別は推定・ラベル付き；タンパク工程はサーモチェック必須。"検証済み"にはまだ到達しない。' },
    'cookmode.cookedOn': { 'en': 'Cooked on', 'es-PE': 'Cocinado el', 'zh-Hans': '烹饪于', 'hi': 'पकाया गया', 'de': 'Gekocht am', 'ja': '調理日' },
    'cookmode.leftoverStatus': { 'en': 'Leftover status', 'es-PE': 'Estado de sobras', 'zh-Hans': '剩余食物状态', 'hi': 'बचे खाद्य की स्थिति', 'de': 'Reste-Status', 'ja': '残り物の状態' },
    'flavor.title': { 'en': 'Flavor Atlas (development preview)', 'es-PE': 'Atlas de sabor (versión de desarrollo)', 'zh-Hans': '风味图谱（开发预览）', 'hi': 'स्वाद एटलस (विकास पूर्वावलोकन)', 'de': 'Flavor-Atlas (Entwicklungsvorschau)', 'ja': 'フレイバーアトラス（開発プレビュー）' },
    'flavor.loadDemo': { 'en': 'Load DEMO data (synthetic)', 'es-PE': 'Cargar datos DEMO (sintéticos)', 'zh-Hans': '加载演示数据（合成）', 'hi': 'डेमो डेटा लोड करें (सिंथेटिक)', 'de': 'DEMO-Daten laden (synthetisch)', 'ja': 'デモデータを読み込む（合成）' },
    'slots.desayuno': { 'en': 'breakfast (desayuno)', 'es-PE': 'desayuno', 'zh-Hans': '早餐', 'hi': 'नाश्ता', 'de': 'Frühstück', 'ja': '朝食' },
    'slots.almuerzo': { 'en': 'lunch (almuerzo)', 'es-PE': 'almuerzo', 'zh-Hans': '午餐', 'hi': 'दोपहर का भोजन', 'de': 'Mittagessen', 'ja': '昼食' },
    'slots.cena': { 'en': 'dinner (cena)', 'es-PE': 'cena', 'zh-Hans': '晚餐', 'hi': 'रात का भोजन', 'de': 'Abendessen', 'ja': '夕食' },
    'slots.refrigerio': { 'en': 'snack (refrigerio)', 'es-PE': 'refrigerio', 'zh-Hans': '加餐', 'hi': 'स्नैक', 'de': 'Snack', 'ja': '間食' },
    'slots.11am': { 'en': '11am snack', 'es-PE': 'picoteo 11am', 'zh-Hans': '上午11点加餐', 'hi': '11 बजे स्नैक', 'de': '11-Uhr-Snack', 'ja': '11時の間食' },
  };

  let language = 'es-PE'; // OWNER DEFAULT: Peruvian Spanish per standing directive
  const listeners = [];

  function t(key) {
    const entry = DICT[key];
    if (!entry) throw new Error(`missing i18n key: ${key}`);
    const val = entry[language];
    if (val == null) throw new Error(`missing translation for ${key} in ${language}`);
    return val;
  }

  function setLanguage(locale) {
    if (!LOCALES.includes(locale)) return { ok: false, error: 'unknown_locale' };
    language = locale;
    for (const cb of listeners) cb(locale);
    for (const cb of listeners) cb(locale);
    if (typeof window !== "undefined" && typeof window.__pgkI18nRebind === "function") window.__pgkI18nRebind(locale);
  }
  function getLanguage() { return language; }
  function onChange(cb) { listeners.push(cb); }

  /** Validation used by tests: every key present in every locale, non-empty. */
  function validateDict() {
    const missing = [];
    for (const [key, locales] of Object.entries(DICT)) {
      for (const loc of LOCALES) {
        if (typeof locales[loc] !== 'string' || locales[loc].length < 1) missing.push(`${key} :: ${loc}`);
      }
    }
    return { locs: LOCALES, missing };
  }

  return { LOCALES, DICT, t, setLanguage, getLanguage, onChange, validateDict };
});
