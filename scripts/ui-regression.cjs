const { chromium } = require('playwright');
const assert = require('node:assert/strict');

// Start the site separately with npm run dev or npm run preview.
const base = new URL(process.env.BASE_URL || 'http://localhost:4321');
const url = (path) => new URL(path, base).href;

(async () => {
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const checks = [];
  let requests = 0;
  let releaseFailedRequest;
  const failedRequestReleased = new Promise((resolve) => { releaseFailedRequest = resolve; });
  page.on('dialog', (dialog) => dialog.accept());

  await page.route('**/*', async (route) => {
    const request = route.request();
    const target = new URL(request.url());
    if (target.origin === base.origin) return route.continue();
    // No external request leaves this test, including real emails or form submissions.
    if (target.hostname !== 'formsubmit.co') return route.abort();
    if (request.method() === 'OPTIONS') {
      return route.fulfill({
        status: 204,
        headers: {
          'access-control-allow-origin': base.origin,
          'access-control-allow-methods': 'POST, OPTIONS',
          'access-control-allow-headers': 'content-type, accept',
        },
      });
    }
    if (request.method() !== 'POST') return route.abort();
    requests++;
    if (requests === 1) {
      await failedRequestReleased;
      return route.abort('failed');
    }
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'access-control-allow-origin': base.origin },
      body: JSON.stringify({ success: 'true' }),
    });
  });

  try {
    await page.goto(url('/about/contact'), { waitUntil: 'networkidle' });
    const trigger = page.locator('#navbtn-about');
    const menu = page.locator('#navmenu-about');
    await trigger.hover();
    assert.equal(await trigger.getAttribute('aria-expanded'), 'true');
    const box = await trigger.boundingBox();
    await page.mouse.move(box.x + 30, box.y + box.height + 2, { steps: 5 });
    assert.equal(await menu.isVisible(), true, 'Pointer transition must keep submenu open');
    checks.push('desktop hover gap');

    await page.keyboard.press('Escape');
    assert.equal(await menu.isVisible(), false);
    assert.equal(await trigger.getAttribute('aria-expanded'), 'false');
    checks.push('desktop Escape');
    await trigger.focus();
    await page.keyboard.press('ArrowDown');
    assert.equal(await menu.isVisible(), true);
    assert.equal(await menu.locator('a').first().evaluate((element) => element === document.activeElement), true);
    await page.keyboard.press('Escape');
    assert.equal(await trigger.evaluate((element) => element === document.activeElement), true);
    checks.push('keyboard disclosure navigation');

    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator('.nav-toggle').click();
    assert.equal(await page.locator('main').evaluate((element) => Boolean(element.closest('[inert]'))), true);
    const last = page.locator('.site-nav__social a').last();
    await last.focus();
    await page.keyboard.press('Tab');
    assert.equal(await page.locator('.site-header').evaluate((element) => element.contains(document.activeElement)), true);
    await page.keyboard.press('Shift+Tab');
    assert.equal(await last.evaluate((element) => element === document.activeElement), true);
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('main').evaluate((element) => Boolean(element.closest('[inert]'))), false);
    assert.equal(await page.locator('.nav-toggle').evaluate((element) => element === document.activeElement), true);
    checks.push('mobile containment and restoration');

    await page.setViewportSize({ width: 768, height: 1024 });
    await page.locator('.nav-toggle').click();
    await page.mouse.click(100, 300);
    assert.equal(await page.locator('.nav-toggle').getAttribute('aria-expanded'), 'false');
    checks.push('tablet backdrop dismissal');

    const form = page.locator('#request-form');
    const submit = form.locator('button[type=submit]');
    await submit.click();
    assert.equal(requests, 0);
    assert.equal(await page.locator('#name').getAttribute('aria-invalid'), 'true');
    assert.match(await page.locator('#name-error').innerText(), /입력해 주세요/);
    checks.push('Korean local validation');
    await page.locator('#name').fill('UI test');
    await page.locator('#email').fill('test@example.com');
    await page.locator('#request_content').fill('Mocked form request only.');
    await Promise.all([
      page.waitForRequest((request) => new URL(request.url()).hostname === 'formsubmit.co' && request.method() === 'POST'),
      submit.click(),
    ]);
    assert.equal(await submit.isDisabled(), true);
    assert.equal(await form.getAttribute('aria-busy'), 'true');
    await form.evaluate((element) => element.requestSubmit());
    assert.equal(requests, 1, 'A second submission while pending must not send another request');
    checks.push('pending state and duplicate submission guard');
    releaseFailedRequest();
    await form.locator('[data-public-status][data-state=error]').waitFor();
    assert.equal(await page.locator('#request_content').inputValue(), 'Mocked form request only.');
    assert.equal(await submit.isEnabled(), true);
    assert.equal(await form.locator('[data-public-fallback]').isVisible(), true);
    checks.push('failed request preserves input and permits retry');

    await form.locator('[data-draft-save]').click();
    await page.reload({ waitUntil: 'networkidle' });
    await form.locator('[data-draft-restore]').click();
    assert.equal(await page.locator('#name').inputValue(), 'UI test');
    assert.equal(await page.locator('#request_content').inputValue(), 'Mocked form request only.');
    checks.push('explicit tab draft recovery');
    await Promise.all([page.waitForURL('**/thanks?form=contact'), submit.click()]);
    assert.equal(await page.locator('[data-thanks-title]').innerText(), '문의가 접수되었습니다.');
    assert.equal(await page.evaluate(() => sessionStorage.getItem('ckgmc:public-draft:contact')), null);
    checks.push('retry success and contact confirmation');

    await page.goto(url('/next-steps/baptism'), { waitUntil: 'networkidle' });
    await page.locator('#bp-name').fill('Baptism test');
    await page.locator('#bp-email').fill('test@example.com');
    await Promise.all([
      page.waitForURL('**/thanks?form=baptism'),
      page.locator('#baptize-request-form button[type=submit]').click(),
    ]);
    assert.equal(await page.locator('[data-thanks-title]').innerText(), '세례 신청이 접수되었습니다.');
    assert.equal(await page.locator('[data-baptism-next]').isVisible(), true);
    checks.push('baptism confirmation');
    assert.equal(requests, 3);
    console.log(JSON.stringify({ ok: true, checks, mockedExternalPosts: requests }, null, 2));
  } finally {
    releaseFailedRequest();
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
