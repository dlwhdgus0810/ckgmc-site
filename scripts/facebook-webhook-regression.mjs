#!/usr/bin/env node
/**
 * 페이스북 웹훅 확인 함수 시험 (src/lib/facebook-webhook.ts) — `node scripts/facebook-webhook-regression.mjs`
 * Node 22.18 이상은 .ts 파일의 타입 표기를 지우고 바로 읽습니다.
 * 실제 주소(/hooks/facebook)까지 보려면 BASE_URL 과 시험용 시크릿을 함께 주세요:
 *   BASE_URL=http://localhost:4321 FACEBOOK_APP_SECRET=… FACEBOOK_WEBHOOK_VERIFY_TOKEN=… node scripts/facebook-webhook-regression.mjs
 */
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { newPostIds, sameSecret, verifySignature } from '../src/lib/facebook-webhook.ts';

const secret = process.env.FACEBOOK_APP_SECRET || 'test-app-secret';
const sign = (body, key = secret) => `sha256=${createHmac('sha256', key).update(body).digest('hex')}`;
const feed = (...values) => JSON.stringify({ object: 'page', entry: [{ id: '208147772642468', time: 1, changes: values.map((value) => ({ field: 'feed', value })) }] });
const passed = [];

// ── 서명 ──
const body = Buffer.from(feed({ item: 'post', verb: 'add', post_id: '1_2', published: 1 }));
assert.equal(await verifySignature(body, sign(body), secret), true);
assert.equal(await verifySignature(body, sign(body).toUpperCase().replace('SHA256=', 'sha256='), secret), true, '16진수 대문자도 허용');
assert.equal(await verifySignature(body, sign(body, 'other-secret'), secret), false, '다른 앱 시크릿');
assert.equal(await verifySignature(Buffer.concat([body, Buffer.from(' ')]), sign(body), secret), false, '본문이 바뀜');
assert.equal(await verifySignature(body, null, secret), false, '서명 없음');
assert.equal(await verifySignature(body, 'sha1=' + 'a'.repeat(40), secret), false, '옛 SHA-1 서명');
assert.equal(await verifySignature(body, 'sha256=zz', secret), false, '형식이 틀림');
assert.equal(await verifySignature(body, sign(body), ''), false, '시크릿 없음');
passed.push('signature');

// ── 확인 문자열 ──
assert.equal(sameSecret('abc', 'abc'), true);
assert.equal(sameSecret('abd', 'abc'), false);
assert.equal(sameSecret('ab', 'abc'), false);
assert.equal(sameSecret(null, 'abc'), false);
assert.equal(sameSecret('abc', undefined), false);
passed.push('verify token');

// ── 어떤 알림이 새 글인가 ──
const ids = (json) => newPostIds(JSON.parse(json));
assert.deepEqual(ids(feed({ item: 'post', verb: 'add', post_id: '1_2', published: 1 })), ['1_2']);
assert.deepEqual(ids(feed(
  { item: 'photo', verb: 'add', post_id: '1_3', photo_id: '9', published: 1 },
  { item: 'photo', verb: 'add', post_id: '1_3', photo_id: '10', published: 1 },
  { item: 'status', verb: 'add', post_id: '1_3', published: 1 },
)), ['1_3'], '사진 여러 장짜리 글은 한 번만');
assert.deepEqual(ids(feed({ item: 'comment', verb: 'add', post_id: '1_2' })), [], '댓글');
assert.deepEqual(ids(feed({ item: 'reaction', verb: 'add', post_id: '1_2' })), [], '반응');
assert.deepEqual(ids(feed({ item: 'post', verb: 'edited', post_id: '1_2' })), [], '수정');
assert.deepEqual(ids(feed({ item: 'post', verb: 'remove', post_id: '1_2' })), [], '삭제');
assert.deepEqual(ids(feed({ item: 'post', verb: 'add', post_id: '1_4', published: 0 })), [], '예약·비공개 글');
assert.deepEqual(ids(JSON.stringify({ object: 'user', entry: [] })), [], '페이지 알림이 아님');
assert.deepEqual(newPostIds(null), []);
assert.deepEqual(newPostIds({ object: 'page', entry: [null, { changes: 'x' }] }), [], '이상한 모양');
passed.push('feed filter');

// ── 실제 주소 (선택) ──
const base = process.env.BASE_URL;
if (base) {
  const url = new URL('/hooks/facebook', base);
  const token = process.env.FACEBOOK_WEBHOOK_VERIFY_TOKEN || 'verify-me-123';
  const get = (q) => fetch(`${url}?${new URLSearchParams(q)}`);
  let r = await get({ 'hub.mode': 'subscribe', 'hub.verify_token': token, 'hub.challenge': '1158201444' });
  assert.equal(r.status, 200);
  assert.equal(await r.text(), '1158201444');
  assert.match(r.headers.get('content-type'), /^text\/plain/);
  r = await get({ 'hub.mode': 'subscribe', 'hub.verify_token': 'wrong', 'hub.challenge': '1' });
  assert.equal(r.status, 403, '틀린 확인 문자열');
  r = await get({ 'hub.mode': 'subscribe', 'hub.verify_token': token, 'hub.challenge': '<script>' });
  assert.equal(r.status, 403, 'challenge 에 다른 글자');

  const post = (payload, signature) => fetch(url, { method: 'POST', headers: { 'content-type': 'application/json', ...(signature ? { 'x-hub-signature-256': signature } : {}) }, body: payload });
  const comment = feed({ item: 'comment', verb: 'add', post_id: '1_2' });
  assert.equal((await post(comment)).status, 401, '서명 없는 POST');
  assert.equal((await post(comment, sign(comment, 'other'))).status, 401, '다른 시크릿으로 서명한 POST');
  r = await post(comment, sign(comment));
  assert.equal(r.status, 200, '서명이 맞는 POST (출처 헤더가 없어도 받아야 함)');
  assert.equal(await r.text(), 'OK');
  const fresh = feed({ item: 'post', verb: 'add', post_id: `test_${Date.now()}`, published: 1 });
  assert.equal((await post(fresh, sign(fresh))).status, 200, '새 글 알림 (워크플로 실행 시도)');
  passed.push('endpoint');
}

console.log(`facebook webhook regression passed: ${passed.join(', ')}`);
