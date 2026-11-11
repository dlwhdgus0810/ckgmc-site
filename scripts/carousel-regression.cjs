const { chromium } = require('playwright');
const assert = require('node:assert/strict');

const base = new URL(process.env.BASE_URL || 'http://localhost:4321');
const passed = [];
const skipped = [];

(async () => {
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
  });
  const createPage = async (options = {}) => {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'no-preference', ...options });
    await context.route('**/*', route => new URL(route.request().url()).origin === base.origin ? route.continue() : route.abort());
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    if (options.javaScriptEnabled !== false) await page.clock.install();
    await page.goto(base.href, { waitUntil: 'networkidle' });
    return { context, page, errors };
  };
  try {
    const { context, page, errors } = await createPage();
    const root = page.locator('[data-notice-carousel][data-notice-current]');
    await root.waitFor();
    await root.scrollIntoViewIfNeeded();
    await page.mouse.move(0, 0);
    await page.clock.pauseAt(await page.evaluate(() => Date.now() + 500));
    const slides = root.locator('[data-notice-slide]');
    const total = await slides.count();
    const count = root.locator('[data-notice-count]');
    const index = async () => Number((await count.innerText()).split('/')[0].trim()) - 1;
    const dots = root.locator('[data-notice-dot]');
    const toggle = root.locator('[data-notice-toggle]');
    if (total > 1) {
      let before = await index();
      await root.locator('[data-notice-next]').click();
      assert.equal(await index(), (before + 1) % total);
      assert.match(await toggle.innerText(), /자동 재생/);
      await root.locator('[data-notice-prev]').click();
      assert.equal(await index(), before);
      await dots.last().click();
      assert.equal(await index(), total - 1);
      assert.equal(await dots.last().getAttribute('aria-current'), 'true');
      passed.push('Previous/next, pagination, and manual rotation stop');

      const current = await index();
      for (let i = 0; i < total; i++) {
        const slide = slides.nth(i);
        assert.equal(await slide.evaluate(element => element.inert), i !== current);
        assert.equal(await slide.getAttribute('aria-hidden'), String(i !== current));
        if (i !== current) {
          const link = slide.locator('a').first();
          await link.evaluate(element => element.focus());
          assert.equal(await link.evaluate(element => element === document.activeElement), false);
        }
      }
      passed.push('Only the active slide can receive keyboard focus');

      await root.locator('[data-notice-next]').focus();
      before = await index();
      await page.keyboard.press('ArrowRight');
      assert.equal(await index(), (before + 1) % total);
      await page.keyboard.press('ArrowLeft');
      assert.equal(await index(), before);
      passed.push('Keyboard arrow navigation');

      await toggle.click();
      await page.mouse.move(0, 0);
      before = await index();
      await page.clock.runFor(6500);
      assert.equal(await index(), (before + 1) % total);
      passed.push('Visible banners rotate automatically');
      await toggle.click();
      before = await index();
      await page.clock.fastForward(13000);
      assert.equal(await index(), before);
      passed.push('Pause holds the selected banner');

      await toggle.click();
      await slides.nth(await index()).hover();
      before = await index();
      await page.clock.fastForward(7000);
      assert.equal(await index(), before);
      await page.mouse.move(0, 0);
      await page.clock.runFor(6500);
      assert.equal(await index(), (before + 1) % total);
      await slides.nth(await index()).locator('a').last().focus();
      before = await index();
      await page.clock.fastForward(7000);
      assert.equal(await index(), before);
      assert.match(await toggle.innerText(), /자동 재생/);
      passed.push('Hover pauses temporarily and keyboard focus stops rotation');
    } else {
      assert.equal(await root.locator('[data-notice-next]').isVisible(), false);
      skipped.push('Multiple-slide interactions: only one published notice');
      passed.push('Single notice does not show unnecessary navigation');
    }
    assert.deepEqual(errors, []);
    await context.close();

    const reduced = await createPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
    const reducedRoot = reduced.page.locator('[data-notice-carousel][data-notice-current]');
    await reducedRoot.waitFor();
    await reducedRoot.scrollIntoViewIfNeeded();
    if (total > 1) {
      const selected = await reducedRoot.locator('[data-notice-count]').innerText();
      assert.match(await reducedRoot.locator('[data-notice-toggle]').innerText(), /자동 재생/);
      await reduced.page.clock.fastForward(13000);
      assert.equal(await reducedRoot.locator('[data-notice-count]').innerText(), selected);
      await reducedRoot.locator('[data-notice-next]').click();
      assert.notEqual(await reducedRoot.locator('[data-notice-count]').innerText(), selected);
      assert.equal(await reducedRoot.locator('[data-notice-track]').evaluate(element => getComputedStyle(element).transitionProperty), 'none');
      passed.push('Reduced motion disables automatic rotation and animated transitions');
    }
    assert.equal(await reduced.page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    assert.deepEqual(reduced.errors, []);
    await reduced.context.close();

    const plain = await createPage({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
    const plainSlides = plain.page.locator('[data-notice-slide]');
    assert.equal(await plainSlides.count(), total);
    for (const slide of await plainSlides.all()) assert.equal(await slide.isVisible(), true);
    assert.equal(await plain.page.locator('[data-notice-next]').isVisible(), false);
    passed.push('Without JavaScript every notice remains readable');
    await plain.context.close();
    console.log(JSON.stringify({ passed, skipped }, null, 2));
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exit(1); });
