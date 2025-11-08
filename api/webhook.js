import 'dotenv/config'
import express from 'express'
import { middleware, Client } from '@line/bot-sdk'
import axios from 'axios'

const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
}
const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL
const client = new Client(config)
const app = express()

// LINEの署名検証はmiddlewareにおまかせ
app.post('/api/webhook', middleware(config), async (req, res) => {
  try {
    const events = req.body.events || []
    await Promise.all(events.map(handleEvent))
    res.status(200).end()
  } catch (e) {
    console.error(e)
    res.status(500).end()
  }
})

function parseLog(text) {
  // 例: /log name="Ch. Margaux 2015" type=wine taste=9 tags=home,friends
  const m = text.match(/^\/log\s+(.+)/i)
  if (!m) return null
  const pairs = m[1].trim().match(/(\w+)=("[^"]+"|[^"\s]+)/g) || []
  const obj = {}
  for (const p of pairs) {
    const [k, vraw] = p.split('=')
    const v = vraw?.replace(/^"(.+)"$/,'$1')
    obj[k.toLowerCase()] = v
  }
  return obj
}

async function handleEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'text') return
  const text = (event.message.text || '').trim()

  if (!text.startsWith('/log')) {
    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: '記録は: /log name=... type=wine taste=8 tags=home\n例: /log name="Ch. Margaux 2015" type=wine taste=9 aroma=9 balance=9 tags=home,friends'
    })
  }

  const data = parseLog(text)
  if (!data || !data.type) {
    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: '形式エラー: /log name=... type=wine ... の形式で入力してください。'
    })
  }

  // メタ情報付与
  data.timestamp = new Date().toISOString()
  data.userId = event.source?.userId || ''

  try {
    const resp = await axios.post(APPS_SCRIPT_URL, data, { timeout: 10000 })
    const ok = resp.status === 200 && resp.data?.ok
    const msg = resp.data?.message || ''
    const replyText = ok ? `保存しました✅\n${msg}` : `保存に失敗しました❌\n${msg}`
    return client.replyMessage(event.replyToken, { type: 'text', text: replyText })
  } catch (e) {
    console.error('Apps Script error:', e?.response?.data || e.message)
    return client.replyMessage(event.replyToken, { type: 'text', text: '保存でエラーが発生しました。' })
  }
}

export default app
