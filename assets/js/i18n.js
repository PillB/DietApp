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
    'weighin.title': { 'en': 'Weigh-in worksheet', 'es-PE': 'Hoja de pesa en cocina', 'zh-Hans': '厨房称重工作表', 'hi': 'किचन वेइ-इन वर्कशीट', 'de': 'Küchen-Wägeblatt', 'ja': 'キッチン計量ワークシート' },
    'weighin.note': { 'en': 'Weigh each ingredient during your cook; the per-serving macros promote to weighed status. Kitchen half only — the dual review is separate.', 'es-PE': 'Pesa cada ingrediente durante la cocción; los macros por porción ascienden a estado pesado. Solo la mitad de cocina — la doble revisión es aparte.', 'zh-Hans': '烹饪时称量每种食材；每份宏量升级为已称重状态。仅厨房部分——双重审核另计。', 'hi': 'पकाते समय हर सामग्री तौलें; प्रति सर्विंग मैक्रो तौला हुआ रैंक तक उन्नत होते हैं। केवल किचन आधा — दोहरी समीक्षा अलग है।', 'de': 'Wäge jede Zutat beim Kochen; die Portions-Makros steigen zum gewogenen Status auf. Nur die Küchenhälfte — das Doppel-Review ist separat.', 'ja': '調理中に各食材を計量。1人分のマクロが計量済みステータスへ昇格。キッチン半分のみ—デュアルレビューは別。' },
    'weighin.submit': { 'en': 'Record weigh-in', 'es-PE': 'Registrar pesa', 'zh-Hans': '记录称重', 'hi': 'वेइ-इन दर्ज करें', 'de': 'Wägung speichern', 'ja': '計量を記録' },

    'nav.overview': { 'en': 'Overview', 'es-PE': 'Vista general', 'zh-Hans': '概览', 'hi': 'अवलोकन', 'de': 'Übersicht', 'ja': '概要' },
    'nav.calendar': { 'en': 'Calendar', 'es-PE': 'Calendario', 'zh-Hans': '日历', 'hi': 'कैलेंडर', 'de': 'Kalender', 'ja': 'カレンダー' },
    'nav.week': { 'en': 'Weekly Menus', 'es-PE': 'Menús semanales', 'zh-Hans': '每周菜单', 'hi': 'साप्ताहिक मेनू', 'de': 'Wochenmenüs', 'ja': '週メニュー' },
    'nav.recipes': { 'en': 'Recipes', 'es-PE': 'Recetas', 'zh-Hans': '食谱', 'hi': 'व्यंजन', 'de': 'Rezepte', 'ja': 'レシピ' },
    'nav.shopping': { 'en': 'Shopping Lists', 'es-PE': 'Listas de compras', 'zh-Hans': '购物清单', 'hi': 'शॉपिंग सूची', 'de': 'Einkaufslisten', 'ja': '買い物リスト' },
    'nav.shopengine': { 'en': 'Plan-based shopping', 'es-PE': 'Compras según tu plan', 'zh-Hans': '按计划购物', 'hi': 'योजना से खरीदारी', 'de': 'Einkauf nach Plan', 'ja': '献立から買い物' },
    'shopping.uiReady': { 'en': "Shopping engine ready", 'es-PE': "Motor de compras listo", 'zh-Hans': "购物清单已就绪", 'hi': "खरीदारी सूची तैयार", 'de': "Einkaufsplanung bereit", 'ja': "買い物リスト準備完了" },
    'shopping.uiAdded': { 'en': "Added {recipe} × {n} on {date}", 'es-PE': "Se agregó {recipe} × {n} para el {date}", 'zh-Hans': "已添加 {recipe} × {n}，日期 {date}", 'hi': "{recipe} × {n} दिनांक {date} के लिए जोड़ा", 'de': "{recipe} × {n} am {date} hinzugefügt", 'ja': "{date} に {recipe} × {n} を追加" },
    'shopping.uiRefused': { 'en': "Cannot add: {reason}", 'es-PE': "No se pudo agregar: {reason}", 'zh-Hans': "无法添加：{reason}", 'hi': "जोड़ नहीं सके: {reason}", 'de': "Hinzufügen nicht möglich: {reason}", 'ja': "追加できません：{reason}" },
    'shopping.uiNeed': { 'en': "Neces­sary {amount} {unit}", 'es-PE': "Necesitas {amount} {unit}", 'zh-Hans': "需要 {amount} {unit}", 'hi': "आवश्यक {amount} {unit}", 'de': "Benötigt {amount} {unit}", 'ja': "必要量 {amount} {unit}" },
    'shopping.uiPackage': { 'en': "Package choice pending", 'es-PE': "Falta elegir una presentación de compra", 'zh-Hans': "待选择包装规格", 'hi': "पैक आकार चुनना बाकी", 'de': "Packungsgröße noch offen", 'ja': "購入する包装規格は未決定" },
    'shopping.uiBuy': { 'en': "Buy {n} × {unit}", 'es-PE': "Compra {n} × {unit}", 'zh-Hans': "购买 {n} × {unit}", 'hi': "{n} × {unit} खरीदें", 'de': "{n} × {unit} kaufen", 'ja': "{n} × {unit} 購入" },
    'shopping.uiPantry': { 'en': "Pantry covers {amount}", 'es-PE': "En despensa tienes {amount}", 'zh-Hans': "库存已有 {amount}", 'hi': "घर में {amount} मौजूद", 'de': "Vorrat deckt {amount}", 'ja': "常備分 {amount}" },
    'shopping.uiEmpty': { 'en': "No meals scheduled in this period", 'es-PE': "No hay comidas planificadas en este período", 'zh-Hans': "此期间没有安排餐食", 'hi': "इस अवधि में कोई भोजन नियोजित नहीं", 'de': "Keine Mahlzeiten im Zeitraum geplant", 'ja': "この期間の献立は未登録" },
    'shopping.uiWarningsNone': { 'en': "No warnings", 'es-PE': "Sin advertencias", 'zh-Hans': "无警告", 'hi': "कोई चेतावनी नहीं", 'de': "Keine Warnungen", 'ja': "警告なし" },
    'shopping.uiNothingToCopy': { 'en': "Nothing to copy yet", 'es-PE': "Todavía no hay nada que copiar", 'zh-Hans': "暂无可复制内容", 'hi': "अभी कॉपी करने के लिए कुछ नहीं", 'de': "Noch nichts zum Kopieren", 'ja': "コピーする項目はまだありません" },
    'shopping.uiCopied': { 'en': "CSV copied to clipboard", 'es-PE': "CSV copiado al portapapeles", 'zh-Hans': "CSV 已复制到剪贴板", 'hi': "CSV क्लिपबोर्ड पर कॉपी हुआ", 'de': "CSV in die Zwischenablage kopiert", 'ja': "CSVをクリップボードにコピー" },
    'shopping.uiClipboardFail': { 'en': "Clipboard unavailable; CSV saved on Copy button", 'es-PE': "Portapapeles no disponible; CSV guardado en el botón Copiar", 'zh-Hans': "剪贴板不可用；CSV 保存在复制按钮上", 'hi': "क्लिपबोर्ड अनुपलब्ध; CSV कॉपी बटन पर सहेजा गया", 'de': "Zwischenablage nicht verfügbar; CSV am Kopieren-Knopf hinterlegt", 'ja': "クリップボードを使用できません。CSVはコピーボタンに保存" },
    'shopping.uiStoreFixture': { 'en': "Store names, package sizes, prices and stock are not yet verified.", 'es-PE': "Nombres comerciales, presentaciones, precios y stock de tiendas aún sin verificar.", 'zh-Hans': "商店商品名、包装、价格和库存尚未核实。", 'hi': "दुकान के उत्पाद नाम, पैक आकार, कीमत और स्टॉक अप्रमाणित हैं।", 'de': "Artikelnamen, Packungen, Preise und Bestand im Geschäft sind noch ungeprüft.", 'ja': "店舗の商品名・包装・価格・在庫は未確認です。" },
    'shopping.uiEsDraft': { 'en': "Draft es-PE", 'es-PE': "es-PE en revisión", 'zh-Hans': "西班牙语草稿", 'hi': "स्पेनिश मसौदा", 'de': "es-PE-Entwurf", 'ja': "スペイン語草稿" },
    'shopping.uiEnProvisional': { 'en': "English provisional", 'es-PE': "Inglés provisional", 'zh-Hans': "暂用英文", 'hi': "अस्थायी अंग्रेज़ी", 'de': "Englisch vorläufig", 'ja': "英語仮表記" },
    'shopping.uiBought': { 'en': "Purchased {name}", 'es-PE': "Comprado: {name}", 'zh-Hans': "已购 {name}", 'hi': "खरीदा: {name}", 'de': "Gekauft: {name}", 'ja': "購入済み: {name}" },
    'shopping.familyProteins': { 'en': "Proteins", 'es-PE': "Proteínas", 'zh-Hans': "蛋白质", 'hi': "प्रोटीन", 'de': "Proteine", 'ja': "タンパク質" },
    'shopping.familyGrains': { 'en': "Grains and cereals", 'es-PE': "Granos y cereales", 'zh-Hans': "谷物", 'hi': "अनाज", 'de': "Getreide", 'ja': "穀物" },
    'shopping.familyVegetables': { 'en': "Vegetables", 'es-PE': "Verduras", 'zh-Hans': "蔬菜", 'hi': "सब्ज़ियाँ", 'de': "Gemüse", 'ja': "野菜" },
    'shopping.familyDairy': { 'en': "Dairy", 'es-PE': "Lácteos", 'zh-Hans': "乳制品", 'hi': "डेयरी", 'de': "Milchprodukte", 'ja': "乳製品" },
    'shopping.familyCondiments': { 'en': "Condiments", 'es-PE': "Condimentos y aliños", 'zh-Hans': "调味品", 'hi': "मसाले", 'de': "Gewürze", 'ja': "調味料" },
    'shopping.familyPantry': { 'en': "Pantry", 'es-PE': "Despensa", 'zh-Hans': "食品储藏", 'hi': "रसोई स्टॉक", 'de': "Vorrat", 'ja': "常備品" },
    'shopping.familyProvisional': { 'en': "Provisional ingredient names", 'es-PE': "Nombres provisionales de ingredientes", 'zh-Hans': "暂用食材名", 'hi': "अस्थायी सामग्री नाम", 'de': "Vorläufige Zutatenamen", 'ja': "仮の食材名" },
    'nav.mobileOpen': { 'en': 'Open menu', 'es-PE': 'Abrir menú', 'zh-Hans': '打开菜单', 'hi': 'मेनू खोलें', 'de': 'Menü öffnen', 'ja': 'メニューを開く' },
    'nav.mobileClose': { 'en': 'Close menu', 'es-PE': 'Cerrar menú', 'zh-Hans': '关闭菜单', 'hi': 'मेनू बंद करें', 'de': 'Menü schließen', 'ja': 'メニューを閉じる' },
    'nav.compliance': { 'en': 'DGA Review', 'es-PE': 'Revisión DGA', 'zh-Hans': '准则审查', 'hi': 'डीजीए समीक्षा', 'de': 'DGA-Prüfung', 'ja': 'ガイドライン確認' },
    'nav.nutrition': { 'en': 'Nutrition & Portions', 'es-PE': 'Nutrición y porciones', 'zh-Hans': '营养与份量', 'hi': 'पोषण और भाग', 'de': 'Ernährung & Portionen', 'ja': '栄養と份量' },
    'nav.knowledge': { 'en': 'Taste DNA', 'es-PE': 'ADN del sabor', 'zh-Hans': '口味DNA', 'hi': 'स्वाद DNA', 'de': 'Geschmacks-DNA', 'ja': '味のDNA' },
    'nav.cook': { 'en': 'Cook', 'es-PE': 'Cocinar', 'zh-Hans': '烹饪', 'hi': 'पकाना', 'de': 'Kochen', 'ja': '調理' },
    'nav.flavor': { 'en': 'Flavor Atlas', 'es-PE': 'Atlas de sabor', 'zh-Hans': '风味图谱', 'hi': 'स्वाद एटलस', 'de': 'Flavor-Atlas', 'ja': 'フレイバーアトラス' },
    'nav.planner': { 'en': 'Planner', 'es-PE': 'Planificador', 'zh-Hans': '计划器', 'hi': 'प्लानर', 'de': 'Planer', 'ja': 'プランナー' },
    'h.fullRecipes': { 'en': 'Full Recipes', 'es-PE': 'Recetas completas', 'zh-Hans': '完整食谱', 'hi': 'पूर्ण व्यंजन', 'de': 'Vollständige Rezepte', 'ja': '完全なレシピ' },
    'h.calendar': { 'en': 'Monthly Calendar', 'es-PE': 'Calendario mensual', 'zh-Hans': '月历', 'hi': 'मासिक कैलेंडर', 'de': 'Monatskalender', 'ja': '月間カレンダー' },
    'h.compliance': { 'en': 'Dietary Guideline Review', 'es-PE': 'Revisión de pautas dietéticas', 'zh-Hans': '膳食指南审查', 'hi': 'आहार दिशानिर्देश समीक्षा', 'de': 'Ernährungsleitlinien-Prüfung', 'ja': '食事ガイドラインレビュー' },
    'h.knowledge': { 'en': 'User Flavor Knowledge Map', 'es-PE': 'Mapa de conocimiento del sabor', 'zh-Hans': '口味知识图谱', 'hi': 'स्वाद ज्ञान मानचित्र', 'de': 'Geschmackswissens-Karte', 'ja': '味の知識マップ' },
    'h.mise': { 'en': 'Mise en place', 'es-PE': 'Mise en place', 'zh-Hans': '备菜', 'hi': 'मिज़ों एन प्लास', 'de': 'Mise en place', 'ja': '下ごしらえ' },
    'h.ingredients': { 'en': 'Ingredients', 'es-PE': 'Ingredientes', 'zh-Hans': '食材', 'hi': 'सामग्री', 'de': 'Zutaten', 'ja': '材料' },
    'h.method': { 'en': 'Method', 'es-PE': 'Preparación', 'zh-Hans': '做法', 'hi': 'विधि', 'de': 'Zubereitung', 'ja': '手順' },
    'h.why': { 'en': 'Why this works', 'es-PE': 'Por qué funciona', 'zh-Hans': '为何有效', 'hi': 'यह क्यों काम करता है', 'de': 'Warum es funktioniert', 'ja': 'なぜ機能するか' },
    'h.plating': { 'en': 'Plating / Pairing', 'es-PE': 'Emplatado / maridaje', 'zh-Hans': '摆盘/搭配', 'hi': 'प्लेटिंग/जोड़ी', 'de': 'Anrichten / Begleitung', 'ja': '盛り付け/ペアリング' },
    'h.complianceRecipe': { 'en': 'PDF Compliance Review', 'es-PE': 'Revisión de cumplimiento', 'zh-Hans': '合规审查', 'hi': 'अनुपालन समीक्षा', 'de': 'Compliance-Prüfung', 'ja': 'コンプライアンス確認' },
    'btn.startShopping': { 'en': 'Start shopping', 'es-PE': 'Iniciar compras', 'zh-Hans': '开始购物', 'hi': 'खरीदारी शुरू करें', 'de': 'Einkaufen starten', 'ja': '買い物を開始' },
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

    // P2.2 planner chrome strings (LEDGER-D44: the RDA/adequacy skeleton was EN-hardcoded)
    'planner.langLabel': { 'en': 'Language', 'es-PE': 'Idioma', 'zh-Hans': '语言', 'hi': 'भाषा', 'de': 'Sprache', 'ja': '言語' },
    'planner.moderate': { 'en': 'moderate', 'es-PE': 'moderado', 'zh-Hans': '适中', 'hi': 'मध्यम', 'de': 'moderat', 'ja': '中程度' },
    'planner.aggressive': { 'en': 'aggressive', 'es-PE': 'agresivo', 'zh-Hans': '激进', 'hi': 'आक्रामक', 'de': 'aggressiv', 'ja': '積極的' },
    'planner.sexLabel': { 'en': 'Sex (for Fe/Zn RDA)', 'es-PE': 'Sexo (para RDA de Fe/Zn)', 'zh-Hans': '性别（用于铁/锌RDA）', 'hi': 'लिंग (Fe/Zn RDA के लिए)', 'de': 'Geschlecht (für Fe/Zn-RDA)', 'ja': '性別（Fe/Zn RDA用）' },
    'planner.male': { 'en': 'male', 'es-PE': 'masculino', 'zh-Hans': '男', 'hi': 'पुरुष', 'de': 'männlich', 'ja': '男性' },
    'planner.female': { 'en': 'female', 'es-PE': 'femenino', 'zh-Hans': '女', 'hi': 'महिला', 'de': 'weiblich', 'ja': '女性' },
    'planner.moveTo': { 'en': 'Move {r} ({id}) to date', 'es-PE': 'Mover {r} ({id}) a la fecha', 'zh-Hans': '将 {r} ({id}) 移动到日期', 'hi': '{r} ({id}) को तारीख पर ले जाएं', 'de': '{r} ({id}) auf Datum verschieben', 'ja': '{r} ({id}) を日付に移動' },
    'planner.copyTo': { 'en': 'Copy {r} ({id}) to date', 'es-PE': 'Copiar {r} ({id}) a la fecha', 'zh-Hans': '将 {r} ({id}) 复制到日期', 'hi': '{r} ({id}) को तारीख पर कॉपी करें', 'de': '{r} ({id}) auf Datum kopieren', 'ja': '{r} ({id}) を日付にコピー' },
    'planner.copyBtn': { 'en': 'Copy →', 'es-PE': 'Copiar →', 'zh-Hans': '复制 →', 'hi': 'कॉपी →', 'de': 'Kopieren →', 'ja': 'コピー →' },
    'planner.deleteBtn': { 'en': 'Delete', 'es-PE': 'Eliminar', 'zh-Hans': '删除', 'hi': 'मिटाएं', 'de': 'Löschen', 'ja': '削除' },
    'planner.repeatTimes': { 'en': 'Repeat ×', 'es-PE': 'Repetir ×', 'zh-Hans': '重复 ×', 'hi': 'दोहराएं ×', 'de': 'Wiederholen ×', 'ja': 'リピート ×' },
    'planner.repeatWeeklyBtn': { 'en': 'Repeat weekly (same weekday)', 'es-PE': 'Repetir semanalmente (mismo día)', 'zh-Hans': '每周重复（同一星期）', 'hi': 'साप्ताहिक दोहराएं (उसी दिन)', 'de': 'Wöchentlich wiederholen (gleicher Wochentag)', 'ja': '毎週繰り返し（同じ曜日）' },
    'planner.repeatWeeklyAria': { 'en': 'Repeat {r} {id} weekly by weekday', 'es-PE': 'Repetir {r} {id} semanalmente por día de semana', 'zh-Hans': '按星期每周重复 {r} {id}', 'hi': '{r} {id} को वार अनुसार साप्ताहिक दोहराएं', 'de': '{r} {id} wöchentlich nach Wochentag wiederholen', 'ja': '{r} {id} を曜日ごとに毎週繰り返し' },
    'planner.familyTitle': { 'en': 'repeat family', 'es-PE': 'familia de repetición', 'zh-Hans': '重复系列', 'hi': 'दोहराव परिवार', 'de': 'Wiederholungsreihe', 'ja': '繰り返し系列' },
    'planner.noEntries': { 'en': '(no plan entries yet — add one at the shopping panel)', 'es-PE': '(sin entradas de plan todavía — agrega una en el panel de compras)', 'zh-Hans': '（还没有计划条目 — 在购物面板添加）', 'hi': '(अभी कोई योजना प्रविष्टि नहीं — दुकान पैनल में जोड़ें)', 'de': '(noch keine Plan-Einträge — im Einkaufs-Panel hinzufügen)', 'ja': '（計画エントリなし — 買い物パネルで追加）' },
    'planner.statusEntries': { 'en': 'plan entry(ies)', 'es-PE': 'entrada(s) de plan', 'zh-Hans': '条目', 'hi': 'योजना प्रविष्टि(यां)', 'de': 'Plan-Eintrag(s)', 'ja': '計画エントリ' },
    'planner.statusFamilies': { 'en': 'repeat family(ies)', 'es-PE': 'familia(s) de repetición', 'zh-Hans': '重复系列', 'hi': 'दोहराव परिवार', 'de': 'Wiederholungsreihe(n)', 'ja': '繰り返し系列' },
    'planner.opOk': { 'en': '{op} ok', 'es-PE': 'Operación {op} correcta', 'zh-Hans': '操作 {op} 成功', 'hi': 'संचालन {op} ठीक', 'de': 'Aktion {op} ok', 'ja': '操作 {op} 成功' },
    'planner.adequacyNotLoaded': { 'en': '(adequacy engine not loaded)', 'es-PE': '(motor de adecuación no cargado)', 'zh-Hans': '（充足度引擎未加载）', 'hi': '(पर्याप्तता इंजन लोड नहीं)', 'de': '(Angemessenheits-Server nicht geladen)', 'ja': '（充足性エンジン未読込）' },
    'planner.adequacyBasis': { 'en': 'Weekly adequacy — basis: {b}', 'es-PE': 'Adecuación semanal — base: {b}', 'zh-Hans': '每周充足度 — 基准: {b}', 'hi': 'साप्ताहिक पर्याप्तता — आधार: {b}', 'de': 'Wöchentliche Angemessenheit — Basis: {b}', 'ja': '週次充足性 — 基準: {b}' },
    'planner.adequacyPartial': { 'en': '⚠ {n} ingredient row(s) without composition — coverage is partial', 'es-PE': '⚠ {n} fila(s) de ingrediente sin composición — la cobertura es parcial', 'zh-Hans': '⚠ {n} 行食材无成分数据 — 覆盖不完整', 'hi': '⚠ {n} सामग्री पंक्ति संरचना के बिना — कवरेज आंशिक है', 'de': '⚠ {n} Zutatenzeile(n) ohne Zusammensetzung — Abdeckung unvollständig', 'ja': '⚠ {n} 行の食材に成分データなし — カバー率は部分的' },
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
