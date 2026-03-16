const chatMessages = document.getElementById('chatMessages');
const chatForm = document.getElementById('chatForm');
const chatInput = document.getElementById('chatInput');
const sendBtn = document.getElementById('sendBtn');

// 会話履歴（APIに送る用）
const conversationHistory = [];

// システムプロンプト（クリニックの情報）
const SYSTEM_PROMPT = `あなたは「山田内科クリニック」の受付スタッフです。
患者さんからの問い合わせに、丁寧かつ簡潔に答えてください。

【クリニック情報】
- 名称: 山田内科クリニック
- 院長: 山田太郎（日本内科学会認定専門医・日本循環器学会専門医）
- 住所: 〒100-0001 東京都千代田区千代田1-1-1 メディカルビル2F
- 電話: 03-1234-5678
- 最寄り駅: JR御茶ノ水駅 徒歩3分、東京メトロ丸ノ内線 御茶ノ水駅 徒歩2分
- 駐車場: 提携駐車場あり（1時間無料）

【診療時間】
- 月・火・水・金: 午前 9:00-12:30 / 午後 15:00-18:30
- 土: 午前 9:00-13:00のみ
- 休診: 木曜・日曜・祝日
- 受付は診療終了30分前まで

【診療内容】
- 一般内科（風邪、腹痛、頭痛など）
- 生活習慣病（高血圧、糖尿病、脂質異常症）
- 循環器内科（院長の専門。心電図・エコー検査可能）
- 健康診断（千代田区特定健診、企業健診、雇入れ時健診）
- 予防接種（インフルエンザ10月〜1月、肺炎球菌）
- オンライン診療（通院中の方の処方のみ）

【特徴】
- 院長が毎回担当（担当医が変わらない）
- Web予約で待ち時間ほぼなし
- 血液検査は翌日に電話で結果をお伝え
- 院内処方（薬局に行く必要なし）

【予約方法】
- Web予約: 24時間受付。前日までの予約がおすすめ。
- 電話予約: 03-1234-5678（診療時間内）
- 予約なしでも診察可能だが、待ち時間あり

【回答ルール】
- 2〜3文で簡潔に答える
- 敬語を使い、親しみやすく
- 医療の具体的な診断・治療のアドバイスはしない
- 「詳しくはお電話（03-1234-5678）でご確認ください」と案内する
- 診療内容に関係ない質問には「申し訳ありませんが、クリニックに関するご質問にお答えしています」と返す`;

// メッセージ追加
function addMessage(text, type) {
    const div = document.createElement('div');
    div.className = `message ${type}`;

    const icon = document.createElement('div');
    icon.className = 'message-icon';
    icon.textContent = type === 'bot' ? '🏥' : '👤';

    const body = document.createElement('div');
    body.className = 'message-body';
    body.innerHTML = `<p>${text.replace(/\n/g, '<br>')}</p>`;

    div.appendChild(icon);
    div.appendChild(body);
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// ローディング表示
function showLoading() {
    const div = document.createElement('div');
    div.className = 'message bot';
    div.id = 'loading';

    const icon = document.createElement('div');
    icon.className = 'message-icon';
    icon.textContent = '🏥';

    const body = document.createElement('div');
    body.className = 'message-body';
    body.innerHTML = '<div class="loading-dots"><span></span><span></span><span></span></div>';

    div.appendChild(icon);
    div.appendChild(body);
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function removeLoading() {
    const el = document.getElementById('loading');
    if (el) el.remove();
}

// Gemini APIに送信
async function sendToAPI(userMessage) {
    conversationHistory.push({
        role: 'user',
        parts: [{ text: userMessage }]
    });

    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ history: conversationHistory })
        });

        if (!response.ok) {
            throw new Error('APIエラー');
        }

        const data = await response.json();
        const botReply = data.reply;

        conversationHistory.push({
            role: 'model',
            parts: [{ text: botReply }]
        });

        return botReply;
    } catch (error) {
        console.error(error);
        return 'すみません、ただいま接続がうまくいきませんでした。お急ぎの場合はお電話（03-1234-5678）でお問い合わせください。';
    }
}

// フォーム送信
chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = chatInput.value.trim();
    if (!text) return;

    chatInput.value = '';
    sendBtn.disabled = true;
    addMessage(text, 'user');
    showLoading();

    const reply = await sendToAPI(text);
    removeLoading();
    addMessage(reply, 'bot');
    sendBtn.disabled = false;
    chatInput.focus();
});

// クイックボタン
document.querySelectorAll('.quick-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        chatInput.value = btn.dataset.message;
        chatForm.dispatchEvent(new Event('submit'));
    });
});
