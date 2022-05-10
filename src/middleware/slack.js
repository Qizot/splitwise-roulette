import crypto from 'crypto'

// verifies the request hmac signature
export function verifySlackSignature(req, res, next) {
  const {
    'x-slack-signature': signature,
    'x-slack-request-timestamp': timestamp
  } = req.headers

  const requestBody = req.body
  const secret = process.env.SLACK_SIGNING_SECRET;

  const base = `v0:${timestamp}:${requestBody}`
  const calculcatedSignature = 'v0=' + crypto.createHmac('sha256', secret)
    .update(base, 'utf8')
    .digest('hex')



  if (crypto.timingSafeEqual(
    Buffer.from(signature, 'utf8'), 
    Buffer.from(calculcatedSignature, 'utf8'))) {
    next()
  } else {
    console.error("Slack verification failed")
    return res.status(400).send("Verification failed")
  }
}
