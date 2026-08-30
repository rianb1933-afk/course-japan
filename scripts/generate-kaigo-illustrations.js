#!/usr/bin/env node
/**
 * Generate professional Kaigo SVG illustrations
 * Creates remaining illustrations for all Kaigo modules
 */

const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, '..', 'assets', 'illustrations');

// Color scheme per category
const COLORS = {
  medical: { bg: '#FEF2F2', bar: '#DC2626', accent: '#FECACA' },
  care: { bg: '#F0FDF4', bar: '#16A34A', accent: '#D1FAE5' },
  safety: { bg: '#FEF9C3', bar: '#D97706', accent: '#FEF3C7' },
  comm: { bg: '#F5F3FF', bar: '#7C3AED', accent: '#E9D5FF' },
  social: { bg: '#EFF6FF', bar: '#2563EB', accent: '#BFDBFE' },
  exam: { bg: '#ECFEFF', bar: '#0891B2', accent: '#CFFAFE' },
};

function svgWrap(color, title, content) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 350">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${color.bg}"/>
      <stop offset="100%" stop-color="#FFF"/>
    </linearGradient>
  </defs>
  <rect width="600" height="350" fill="url(#bg)" rx="12"/>
  <rect x="0" y="0" width="600" height="40" fill="${color.bar}" rx="12"/>
  <rect x="0" y="28" width="600" height="12" fill="${color.bar}"/>
  <text x="300" y="26" text-anchor="middle" font-family="system-ui,sans-serif" font-size="14" font-weight="700" fill="#FFF">${title}</text>
${content}
</svg>`;
}

function card(x, y, w, h, borderColor, items) {
  let content = `  <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="10" fill="#FFF" stroke="${borderColor}" stroke-width="1"/>\n`;
  items.forEach(item => {
    content += `  <text x="${item.x}" y="${item.y}" ${item.anchor ? `text-anchor="${item.anchor}" ` : ''}font-family="system-ui,sans-serif" font-size="${item.size || 10}" ${item.weight ? `font-weight="${item.weight}" ` : ''}fill="${item.color || '#374151'}">${item.text}</text>\n`;
  });
  return content;
}

const illustrations = {
  'earthquake.svg': svgWrap(COLORS.safety, '地震対応 · Gempa Bumi · Earthquake Safety',
    card(20, 52, 260, 180, '#FEF3C7', [
      { x: 150, y: 72, anchor: 'middle', text: '地震の備え (Persiapan)', size: 11, weight: '700' },
      { x: 40, y: 100, text: '● はらdrops.csと猫背の_dropを' },
      { x: 40, y: 100, text: '● ドロップ・コップ・ロープ' },
      { x: 40, y: 118, text: '● 安全な場所を確認' },
      { x: 40, y: 136, text: '● 非常持出袋の準備' },
      { x: 40, y: 154, text: '● 家族との連絡方法' },
      { x: 40, y: 172, text: '● 避難経路の確認' },
      { x: 40, y: 190, text: '● 地震訓練に参加' },
      { x: 40, y: 208, text: '● 利用者の避難支援' },
    ]) +
    card(310, 52, 270, 180, '#FEF3C7', [
      { x: 445, y: 72, anchor: 'middle', text: '地震時の行動', size: 11, weight: '700' },
      { x: 325, y: 100, text: '1. テーブルの下に隠れる' },
      { x: 325, y: 118, text: '2. ドアを開ける' },
      { x: 325, y: 136, text: '3. ガスの元栓を閉める' },
      { x: 325, y: 154, text: '4. 電気のブレーカーを落とす' },
      { x: 325, y: 172, text: '5. 避難場所へ移動' },
      { x: 325, y: 190, text: '6. 利用者の安否確認' },
      { x: 325, y: 208, text: '7. 上司に報告' },
    ]),
  'wheelchair.svg': svgWrap(COLORS.care, '車椅子 · Kursi Roda · Wheelchair Safety',
    card(20, 52, 260, 180, '#D1FAE5', [
      { x: 150, y: 72, anchor: 'middle', text: '車椅子の安全', size: 11, weight: '700' },
      { x: 40, y: 100, text: '● ブレーキをかける (Rem)' },
      { x: 40, y: 118, text: '● フットレストを上げる' },
      { x: 40, y: 136, text: '● 足元に物を置かない' },
      { x: 40, y: 154, text: '● 坂道は後ろ向きに' },
      { x: 40, y: 172, text: '● 階段は lifts を使用' },
      { x: 40, y: 190, text: '● 安全ベルトを装着' },
      { x: 40, y: 208, text: '● 定期点検を実施' },
    ]) +
    card(310, 52, 270, 180, '#D1FAE5', [
      { x: 445, y: 72, anchor: 'middle', text: '移乗 Assist', size: 11, weight: '700' },
      { x: 325, y: 100, text: '1. ブレーキをかける' },
      { x: 325, y: 118, text: '2. フットレストを外す' },
      { x: 325, y: 136, text: '3. 利用者の腰を支える' },
      { x: 325, y: 154, text: '4. 「せーの」で立つ' },
      { x: 325, y: 172, text: '5. ゆっくり座る' },
      { x: 325, y: 190, text: '6. 姿勢を整える' },
      { x: 325, y: 208, text: '7. 安全確認' },
    ]),
  'bathing-care.svg': svgWrap(COLORS.care, '入浴介助 · Bantuan Mandi · Bathing Care',
    card(20, 52, 260, 180, '#D1FAE5', [
      { x: 150, y: 72, anchor: 'middle', text: '入浴の準備', size: 11, weight: '700' },
      { x: 40, y: 100, text: '● 湯温を確認 (38-40°C)' },
      { x: 40, y: 118, text: '● 滑り止めマット' },
      { x: 40, y: 136, text: '● 必要な用品を準備' },
      { x: 40, y: 154, text: '● 室温を調整 (24-26°C)' },
      { x: 40, y: 172, text: '● 緊急ベルの確認' },
      { x: 40, y: 190, text: '● 利用者の体調確認' },
      { x: 40, y: 208, text: '● 同性の介護士が担当' },
    ]) +
    card(310, 52, 270, 180, '#D1FAE5', [
      { x: 445, y: 72, anchor: 'middle', text: '入浴手順', size: 11, weight: '700' },
      { x: 325, y: 100, text: '1. 洗髪 (Shampoo)' },
      { x: 325, y: 118, text: '2. 体を洗う (Cuci tubuh)' },
      { x: 325, y: 136, text: '3. すすぎ (Bilas)' },
      { x: 325, y: 154, text: '4. 浴槽に入る (Masuk bak)' },
      { x: 325, y: 172, text: '5. 暖める (Hangatkan)' },
      { x: 325, y: 190, text: '6. 出る (Keluar)' },
      { x: 325, y: 208, text: '7. 体を拭く (Keringkan)' },
    ]),
  'meal-support.svg': svgWrap(COLORS.care, '食事介助 · Bantuan Makan · Meal Support',
    card(20, 52, 260, 180, '#D1FAE5', [
      { x: 150, y: 72, anchor: 'middle', text: '食事の準備', size: 11, weight: '700' },
      { x: 40, y: 100, text: '● プレートを確認' },
      { x: 40, y: 118, text: '● 保護着を装着' },
      { x: 40, y: 136, text: '● 手を洗う' },
      { x: 40, y: 154, text: '● 座椅子に座る' },
      { x: 40, y: 172, text: '● テーブルの高さ確認' },
      { x: 40, y: 190, text: '● 嚥下確認' },
      { x: 40, y: 208, text: '● 食事内容の確認' },
    ]) +
    card(310, 52, 270, 180, '#D1FAE5', [
      { x: 445, y: 72, anchor: 'middle', text: '食事中', size: 11, weight: '700' },
      { x: 325, y: 100, text: '1. 姿勢を整える' },
      { x: 325, y: 118, text: '2. 少しずつ提供' },
      { x: 325, y: 136, text: '3. 噛むのを確認' },
      { x: 325, y: 154, text: '4. 飲み込みを確認' },
      { x: 325, y: 172, text: '5. 食後の口腔ケア' },
      { x: 325, y: 190, text: '6. 安否確認' },
      { x: 325, y: 208, text: '7. 記録をつける' },
    ]),
  'terminal-care.svg': svgWrap(COLORS.care, 'ターミナルケア · Perawatan Paliatif · Terminal Care',
    card(20, 52, 260, 180, '#D1FAE5', [
      { x: 150, y: 72, anchor: 'middle', text: 'ターミナルケア', size: 11, weight: '700' },
      { x: 40, y: 100, text: '● ペインコントロール' },
      { x: 40, y: 118, text: '● プシュコロジカルケア' },
      { x: 40, y: 136, text: '● 家族への支援' },
      { x: 40, y: 154, text: '● 生活の質向上' },
      { x: 40, y: 172, text: '● 安らかな最期' },
      { x: 40, y: 190, text: '● コミュニケーション' },
      { x: 40, y: 208, text: '● 文化的ニーズ' },
    ]) +
    card(310, 52, 270, 180, '#D1FAE5', [
      { x: 445, y: 72, anchor: 'middle', text: 'ケアのポイント', size: 11, weight: '700' },
      { x: 325, y: 100, text: '● 苦痛の評価 (NRS)' },
      { x: 325, y: 118, text: '● 薬の管理' },
      { x: 325, y: 136, text: '● 清潔維持' },
      { x: 325, y: 154, text: '● 口腔ケア' },
      { x: 325, y: 172, text: '● 皮膚ケア' },
      { x: 325, y: 190, text: '● 栄養管理' },
      { x: 325, y: 208, text: '● リラックス環境' },
    ]),
  'palliative-care.svg': svgWrap(COLORS.care, '緩和ケア · Palliative Care · Perawatan Pendukung',
    card(20, 52, 260, 180, '#D1FAE5', [
      { x: 150, y: 72, anchor: 'middle', text: '緩和ケアの原則', size: 11, weight: '700' },
      { x: 40, y: 100, text: '● 痛みの軽減' },
      { x: 40, y: 118, text: '● 心理的支援' },
      { x: 40, y: 136, text: '● 社会的支援' },
      { x: 40, y: 154, text: '● スピリチュアルケア' },
      { x: 40, y: 172, text: '● 生活の質向上' },
      { x: 40, y: 190, text: '● 家族への支援' },
      { x: 40, y: 208, text: '● チームケア' },
    ]) +
    card(310, 52, 270, 180, '#D1FAE5', [
      { x: 445, y: 72, anchor: 'middle', text: 'ケアの実践', size: 11, weight: '700' },
      { x: 325, y: 100, text: '● 個別ケアプラン' },
      { x: 325, y: 118, text: '● 多職種連携' },
      { x: 325, y: 136, text: '● 家族会议' },
      { x: 325, y: 154, text: '● 記録の共有' },
      { x: 325, y: 172, text: '● アセスメント' },
      { x: 325, y: 190, text: '● 評価と修正' },
      { x: 325, y: 208, text: '● 安らぎの提供' },
    ]),
  'communication.svg': svgWrap(COLORS.comm, 'コミュニケーション · Komunikasi · Communication Skills',
    card(20, 52, 260, 180, '#E9D5FF', [
      { x: 150, y: 72, anchor: 'middle', text: 'コミュニケーション', size: 11, weight: '700' },
      { x: 40, y: 100, text: '● アクティブリスニング' },
      { x: 40, y: 118, text: '● 共感的理解' },
      { x: 40, y: 136, text: '● 非言語コミュニケーション' },
      { x: 40, y: 154, text: '● 明確な表現' },
      { x: 40, y: 172, text: '● 相手のペースに合わせる' },
      { x: 40, y: 190, text: '● ポジティブな姿勢' },
      { x: 40, y: 208, text: '● 文化的配慮' },
    ]) +
    card(310, 52, 270, 180, '#E9D5FF', [
      { x: 445, y: 72, anchor: 'middle', text: '実践スキル', size: 11, weight: '700' },
      { x: 325, y: 100, text: '● 質問の仕方' },
      { x: 325, y: 118, text: '● 要約の仕方' },
      { x: 325, y: 136, text: '● 共感の伝え方' },
      { x: 325, y: 154, text: '● 伝言の仕方' },
      { x: 325, y: 172, text: '● カンファレンス参加' },
      { x: 325, y: 190, text: '● 記録の書き方' },
      { x: 325, y: 208, text: '● 報告の仕方' },
    ]),
  'speaking-practice.svg': svgWrap(COLORS.comm, '会話練習 · Latihan Berbicara · Speaking Practice',
    card(20, 52, 260, 180, '#E9D5FF', [
      { x: 150, y: 72, anchor: 'middle', text: '会話の基本', size: 11, weight: '700' },
      { x: 40, y: 100, text: '● イントネーション' },
      { x: 40, y: 118, text: '● リズム' },
      { x: 40, y: 136, text: '● テンポ' },
      { x: 40, y: 154, text: '● ピッチ' },
      { x: 40, y: 172, text: '● 強調' },
      { x: 40, y: 190, text: '● 感情表現' },
      { x: 40, y: 208, text: '● スピード調整' },
    ]) +
    card(310, 52, 270, 180, '#E9D5FF', [
      { x: 445, y: 72, anchor: 'middle', text: '練習テーマ', size: 11, weight: '700' },
      { x: 325, y: 100, text: '● 自己紹介' },
      { x: 325, y: 118, text: '● 利用者への挨拶' },
      { x: 325, y: 136, text: '● 家族への説明' },
      { x: 325, y: 154, text: '● 上司への報告' },
      { x: 325, y: 172, text: '● 同僚との連絡' },
      { x: 325, y: 190, text聚: '● 困難な状況対応' },
      { x: 325, y: 208, text: '● 緊急時報告' },
    ]),
  'self-reliance.svg': svgWrap(COLORS.comm, '自立支援 · Dukungan Mandiri · Self-Reliance',
    card(20, 52, 260, 180, '#E9D5FF', [
      { x: 150, y: 72, anchor: 'middle', text: '自立支援の原則', size: 11, weight: '700' },
      { x: 40, y: 100, text: '● 利用者の意思決定' },
      { x: 40, y: 118, text: '● 残存機能の活用' },
      { x: 40, y: 136, text: '● リハビリテーション' },
      { x: 40, y: 154, text: '● 生活指導' },
      { x: 40, y: 172, text: '● 社会参加支援' },
      { x: 40, y: 190, text: '● 就労支援' },
      { x: 40, y: 208, text: '● 福祉サービス紹介' },
    ]) +
    card(310, 52, 270, 180, '#E9D5FF', [
      { x: 445, y: 72, anchor: 'middle', text: '支援の方法', size: 11, weight: '700' },
      { x: 325, y: 100, text: '● アセスメント' },
      { x: 325, y: 118, text: '● ケアプラン作成' },
      { x: 325, y: 136, text: '● 目標設定' },
      { x: 325, y: 154, text: '● 定期評価' },
      { x: 325, y: 172, text: '● チーム連携' },
      { x: 325, y: 190, text: '● 家族支援' },
      { x: 325, y: 208, text: '● 記録管理' },
    ]),
  'mental-health.svg': svgWrap(COLORS.comm, 'メンタルヘルス · Kesehatan Mental · Mental Health',
    card(20, 52, 260, 180, '#E9D5FF', [
      { x: 150, y: 72, anchor: 'middle', text: 'メンタルヘルス', size: 11, weight: '700' },
      { x: 40, y: 100, text: '● ストレス管理' },
      { x: 40, y: 118, text: '● バーンアウト防止' },
      { x: 40, y: 136, text: '● マインドフルネス' },
      { x: 40, y: 154, text: '● リラクゼーション' },
      { x: 40, y: 172, text: '● 社会的支援' },
      { x: 40, y: 190, text: '● 専門機関の利用' },
      { x: 40, y: 208, text: '● 自己認識' },
    ]) +
    card(310, 52, 270, 180, '#E9D5FF', [
      { x: 445, y: 72, anchor: 'middle', text: 'ケア方法', size: 11, weight: '700' },
      { x: 325, y: 100, text: '● 休憩の確保' },
      { x: 325, y: 118, text: '● 運動習慣' },
      { x: 325, y: 136, text: '● 規則正しい生活' },
      { x: 325, y: 154, text: '● 趣味の時間' },
      { x: 325, y: 172, text: '● 相談窓口の利用' },
      { x: 325, y: 190, text: '● 同僚との交流' },
      { x: 325, y: 208, text: '● 定期健診' },
    ]),
  'social-welfare.svg': svgWrap(COLORS.social, '社会福祉 · Kesejahteraan Sosial · Social Welfare',
    card(20, 52, 260, 180, '#BFDBFE', [
      { x: 150, y: 72, anchor: 'middle', text: '社会福祉制度', size: 11, weight: '700' },
      { x: 40, y: 100, text: '● 介護保険制度' },
      { x: 40, y: 118, text: '● 障害福祉サービス' },
      { x: 40, y: 136, text: '● 生活保護' },
      { x: 40, y: 154, text: '● 高齢者福祉' },
      { x: 40, y: 172, text: '● 子育て支援' },
      { x: 40, y: 190, text: '● 医療保険' },
      { x: 40, y: 208, text: '● 年金制度' },
    ]) +
    card(310, 52, 270, 180, '#BFDBFE', [
      { x: 445, y: 72, anchor: 'middle', text: '相談窓口', size: 11, weight: '700' },
      { x: 325, y: 100, text: '● 地域包括支援センター' },
      { x: 325, y: 118, text: '● 区役所・市役所' },
      { x: 325, y: 136, text: '● 社会福祉協議会' },
      { x: 325, y: 154, text: '● 民生委員' },
      { x: 325, y: 172, text: '● 保健師' },
      { x: 325, y: 190, text: '● 福祉事務所' },
      { x: 325, y: 208, text: '● NPO法人' },
    ]),
  'legal-ethics.svg': svgWrap(COLORS.social, '法と倫理 · Hukum dan Etika · Legal & Ethics',
    card(20, 52, 260, 180, '#BFDBFE', [
      { x: 150, y: 72, anchor: 'middle', text: '介護の法的基盤', size: 11, weight: '700' },
      { x: 40, y: 100, text: '● 介護保険法' },
      { x: 40, y: 118, text: '● 障害者総合支援法' },
      { x: 40, y: 136, text: '● 高齢者虐待防止法' },
      { x: 40, y: 154, text: '● 個人情報保護法' },
      { x: 40, y: 172, text: '● 労働基準法' },
      { x: 40, y: 190, text: '● 医療法' },
      { x: 40, y: 208, text: '● 社会福祉士法' },
    ]) +
    card(310, 52, 270, 180, '#BFDBFE', [
      { x: 445, y: 72, anchor: 'middle', text: '倫理原則', size: 11, weight: '700' },
      { x: 325, y: 100, text: '● 自主性の尊重' },
      { x: 325, y: 118, text: '● 個別化の原則' },
      { x: 325, y: 136, text: '● 生活支援' },
      { x: 325, y: 154, text: '● 社会参加' },
      { x: 325, y: 172, text: '● プライバシー保護' },
      { x: 325, y: 190, text: '● 同意取得' },
      { x: 325, y: 208, text: '● 秘密保持' },
    ]),
  'documentation.svg': svgWrap(COLORS.social, '記録管理 · Dokumentasi · Documentation',
    card(20, 52, 260, 180, '#BFDBFE', [
      { x: 150, y: 72, anchor: 'middle', text: '記録の種類', size: 11, weight: '700' },
      { x: 40, y: 100, text: '● 日報 (Harian)' },
      { x: 40, y: 118, text: '● 週報 (Mingguan)' },
      { x: 40, y: 136, text: '● 月報 (Bulanan)' },
      { x: 40, y: 154, text: '● アセスメント' },
      { x: 40, y: 172, text: '● ケアプラン' },
      { x: 40, y: 190, text: '● 指示書' },
      { x: 40, y: 208, text: '● インシデント報告' },
    ]) +
    card(310, 52, 270, 180, '#BFDBFE', [
      { x: 445, y: 72, anchor: 'middle', text: '記録の書き方', size: 11, weight: '700' },
      { x: 325, y: 100, text: '● 5W1Hを明確に' },
      { x: 325, y: 118, text: '● 客観的事実を記録' },
      { x: 325, y: 136, text: '● 主観は区別する' },
      { x: 325, y: 154, text: '● 正確な記述' },
      { x: 325, y: 172, text: '● 及時性を保つ' },
      { x: 325, y: 190, text: '● 連続性を保つ' },
      { x: 325, y: 208, text: '● 漏れなく記録' },
    ]),
  'exam-prep.svg': svgWrap(COLORS.exam, '試験準備 · Persiapan Ujian · Exam Preparation',
    card(20, 52, 260, 180, '#CFFAFE', [
      { x: 150, y: 72, anchor: 'middle', text: '試験対策', size: 11, weight: '700' },
      { x: 40, y: 100, text: '● 過去問を解く' },
      { x: 40, y: 118, text: '● タイム管理練習' },
      { x: 40, y: 136, text: '● 弱点克服' },
      { x: 40, y: 154, text: '● モックテスト' },
      { x: 40, y: 172, text: '● 解説を読む' },
      { x: 40, y: 190, text: '● 繰り返し復習' },
      { x: 40, y: 208, text: '● 休息を取る' },
    ]) +
    card(310, 52, 270, 180, '#CFFAFE', [
      { x: 445, y: 72, anchor: 'middle', text: '学習ポイント', size: 11, weight: '700' },
      { x: 325, y: 100, text: '● 基礎を固める' },
      { x: 325, y: 118, text: '● 実践的な知識' },
      { x: 325, y: 136, text: '● 法令を理解' },
      { x: 325, y: 154, text: '● ロールプレイ' },
      { x: 325, y: 172, text: '● ケーススタディ' },
      { x: 325, y: 190, text: '● 討論に参加' },
      { x: 325, y: 208, text: '● 定期テスト' },
    ]),
  'medical-care.svg': svgWrap(COLORS.medical, '医療的ケア · Perawatan Medis · Medical Care',
    card(20, 52, 260, 180, '#FECACA', [
      { x: 150, y: 72, anchor: 'middle', text: '医療処置', size: 11, weight: '700' },
      { x: 40, y: 100, text: '● バイタル測定' },
      { x: 40, y: 118, text: '● 経管栄養' },
      { x: 40, y: 136, text: '● カテーテル管理' },
      { x: 40, y: 154, text: '● 創傷処置' },
      { x: 40, y: 172, text: '● 投薬管理' },
      { x: 40, y: 190, text: '● インスリン注射' },
      { x: 40, y: 208, text: '● 在宅酸素' },
    ]) +
    card(310, 52, 270, 180, '#FECACA', [
      { x: 445, y: 72, anchor: 'middle', text: '注意事項', size: 11, weight: '700' },
      { x: 325, y: 100, text: '● 医師の指示に従う' },
      { x: 325, y: 118, text: '● 感染対策を徹底' },
      { x: 325, y: 136, text: '● 機器の管理' },
      { x: 325, y: 154, text: '● 異変の早期発見' },
      { x: 325, y: 172, text: '● 記録の正確性' },
      { x: 325, y: 190, text: '● 家族への説明' },
      { x: 325, y: 208, text: '● 緊急時対応' },
    ]),
  'stroke-care.svg': svgWrap(COLORS.medical, '脳卒中ケア · Perawatan Stroke · Stroke Care',
    card(20, 52, 260, 180, '#FECACA', [
      { x: 150, y: 72, anchor: 'middle', text: 'FASTサイン', size: 11, weight: '700' },
      { x: 40, y: 100, text: '● Face 顔 → 顔がゆがむ' },
      { x: 40, y: 118, text: '● Arm 腕 → 腕が上がらない' },
      { x: 40, y: 136, text: '● Speech 言葉 → 話しづらい' },
      { x: 40, y: 154, text: '● Time 時間 → 速やかに救急' },
      { x: 40, y: 172, text: '' },
      { x: 40, y: 190, text: '● 脳梗塞 vs 脳出血' },
      { x: 40, y: 208, text: '● リハビリの開始' },
    ]) +
    card(310, 52, 270, 180, '#FECACA', [
      { x: 445, y: 72, anchor: 'middle', text: 'リハビリ', size: 11, weight: '700' },
      { x: 325, y: 100, text: '● 運動療法' },
      { x: 325, y: 118, text: '● 作業療法' },
      { x: 325, y: 136, text: '● 言語療法' },
      { x: 325, y: 154, text: '● ADL訓練' },
      { x: 325, y: 172, text: '● 認知リハビリ' },
      { x: 325, y: 190, text: '● 在宅復帰支援' },
      { x: 325, y: 208, text: '● 通所リハビリ' },
    ]),
  'diabetes-care.svg': svgWrap(COLORS.medical, '糖尿病ケア · Diabetes Care · Pengelolaan Diabetes',
    card(20, 52, 260, 180, '#FECACA', [
      { x: 150, y: 72, anchor: 'middle', text: '血糖管理', size: 11, weight: '700' },
      { x: 40, y: 100, text: '● 空腹時血糖値 70-110' },
      { x: 40, y: 118, text: '● 食後血糖値 <180' },
      { x: 40, y: 136, text: '● HbA1c <7.0%' },
      { x: 40, y: 154, text: '● 定期測定' },
      { x: 40, y: 172, text: '● 記録管理' },
      { x: 40, y: 190, text: '● 低血糖対策' },
      { x: 40, y: 208, text: '● 合併症予防' },
    ]) +
    card(310, 52, 270, 180, '#FECACA', [
      { x: 445, y: 72, anchor: 'middle', text: '生活管理', size: 11, weight: '700' },
      { x: 325, y: 100, text: '● 食事療法' },
      { x: 325, y: 118, text: '● 運動療法' },
      { x: 325, y: 136, text: '● 薬物療法' },
      { x: 325, y: 154, text: '● 足の护理' },
      { x: 325, y: 172, text: '● ダイアリー管理' },
      { x: 325, y: 190, text: '● 体重管理' },
      { x: 325, y: 208, text: '● ストレス管理' },
    ]),
  'parkinson-care.svg': svgWrap(COLORS.medical, 'パーキンソンケア · Parkinson Care · Perawatan Parkinson',
    card(20, 52, 260, 180, '#FECACA', [
      { x: 150, y: 72, anchor: 'middle', text: '症状の理解', size: 11, weight: '700' },
      { x: 40, y: 100, text: '● 振戦 ( trembling )' },
      { x: 40, y: 118, text: '● 筋固縮 ( rigiditas )' },
      { x: 40, y: 136, text: '● 動作緩慢 ( Bradykinesia )' },
      { x: 40, y: 154, text: '● 姿勢反射障害' },
      { x: 40, y: 172, text: '● 歩行障害' },
      { x: 40, y: 190, text: '● 言語障害' },
      { x: 40, y: 208, text: '● 自律神経障害' },
    ]) +
    card(310, 52, 270, 180, '#FECACA', [
      { x: 445, y: 72, anchor: 'middle', text: 'ケアのポイント', size: 11, weight: '700' },
      { x: 325, y: 100, text: '● 転倒予防' },
      { x: 325, y: 118, text: '● 安全な移動' },
      { x: 325, y: 136, text: '● 薬の管理' },
      { x: 325, y: 154, text: '● 運動療法' },
      { x: 325, y: 172, text: '● 栄養管理' },
      { x: 325, y: 190, text: '● 認知対策' },
      { x: 325, y: 208, text: '● 家族教育' },
    ]),
  'osteoporosis.svg': svgWrap(COLORS.medical, '骨粗鬆症 · Osteoporosis · Pencegahan Osteoporosis',
    card(20, 52, 260, 180, '#FECACA', [
      { x: 150, y: 72, anchor: 'middle', text: '骨粗鬆症の理解', size: 11, weight: '700' },
      { x: 40, y: 100, text: '● 骨密度の低下' },
      { x: 40, y: 118, text: '● 骨折リスク増加' },
      { x: 40, y: 136, text: '● 加齢による影響' },
      { x: 40, y: 154, text: '● ホルモンバランス' },
      { x: 40, y: 172, text: '● カルシウム不足' },
      { x: 40, y: 190, text: '● 運動不足' },
      { x: 40, y: 208, text: '● 遺伝的要因' },
    ]) +
    card(310, 52, 270, 180, '#FECACA', [
      { x: 445, y: 72, anchor: 'middle', text: '予防策', size: 11, weight: '700' },
      { x: 325, y: 100, text: '● カルシウム摂取' },
      { x: 325, y: 118, text: '● ビタミンD' },
      { x: 325, y: 136, text: '● 適度な運動' },
      { x: 325, y: 154, text: '● 日光浴り' },
      { x: 325, y: 172, text: '● 禁煙' },
      { x: 325, y: 190, text: '● 節酒' },
      { x: 325, y: 208, text: '● 定期検査' },
    ]),
  'contraction-prevention.svg': svgWrap(COLORS.safety, '拘縮予防 · Pencegahan Kontraktur · Contraction Prevention',
    card(20, 52, 260, 180, '#FEF3C7', [
      { x: 150, y: 72, anchor: 'middle', text: '拘縮の理解', size: 11, weight: '700' },
      { x: 40, y: 100, text: '● 関節の可動域制限' },
      { x: 40, y: 118, text: '● 筋肉の短縮' },
      { x: 40, y: 136, text: '● 長期臥床が原因' },
      { x: 40, y: 154, text: '● 早期発見が重要' },
      { x: 40, y: 172, text: '● 予防が最も有効' },
      { x: 40, y: 190, text: '' },
      { x: 40, y: 208, text: '' },
    ]) +
    card(310, 52, 270, 180, '#FEF3C7', [
      { x: 445, y: 72, anchor: 'middle', text: '予防方法', size: 11, weight: '700' },
      { x: 325, y: 100, text: '● パッシブ运动' },
      { x: 325, y: 118, text: '● 体位交換 (2時間ごと)' },
      { x: 325, y: 136, text: '● ポジショニング' },
      { x: 325, y: 154, text: '● 可動域運動' },
      { x: 325, y: 172, text: '● 温熱療法' },
      { x: 325, y: 190, text: '● マッサージ' },
      { x: 325, y: 208, text: '● 記録管理' },
    ]),
};

// Generate all illustrations
Object.entries(illustrations).forEach(([filename, content]) => {
  const filepath = path.join(DIR, filename);
  fs.writeFileSync(filepath, content, 'utf8');
  console.log(`✅ Created: ${filename}`);
});

console.log(`\n🎉 Generated ${Object.keys(illustrations).length} illustrations`);
