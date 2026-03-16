export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        return res.status(500).json({ error: 'API key not configured' });
    }

    const { history } = req.body;
    if (!history || !Array.isArray(history) || history.length === 0 || history.length > 20) {
        return res.status(400).json({ error: 'Invalid request' });
    }

    const isValidMessage = (msg) =>
        msg && typeof msg.role === 'string' &&
        ['user', 'model'].includes(msg.role) &&
        Array.isArray(msg.parts) &&
        msg.parts.every(p => typeof p.text === 'string' && p.text.length <= 5000);

    if (!history.every(isValidMessage)) {
        return res.status(400).json({ error: 'Invalid message format' });
    }

    const systemPrompt = `あなたは「山田内科クリニック」の受付スタッフです。
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

    try {
        const response = await fetch(
            'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-goog-api-key': apiKey
                },
                body: JSON.stringify({
                    systemInstruction: {
                        parts: [{ text: systemPrompt }]
                    },
                    contents: history,
                    generationConfig: {
                        maxOutputTokens: 2048,
                        temperature: 0.7
                    }
                })
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Gemini API error:', response.status, errorText);
            return res.status(502).json({ error: 'AI service error' });
        }

        const data = await response.json();
        const reply = data.candidates?.[0]?.content?.parts?.[0]?.text
            || 'すみません、うまく回答を生成できませんでした。お電話（03-1234-5678）でお問い合わせください。';

        return res.status(200).json({ reply });
    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
