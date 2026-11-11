const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const base = new URL(process.env.BASE_URL || 'http://localhost:4321');
const passed = [];

(async () => {
  const browser = await chromium.launch({ headless: true, ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}) });
  const create = async (options = {}) => {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'no-preference', ...options });
    await context.route('**/*', route => new URL(route.request().url()).origin === base.origin ? route.continue() : route.abort());
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    if (options.javaScriptEnabled !== false) await page.clock.install();
    await page.goto(base.href, { waitUntil: 'networkidle' });
    const root = page.locator('.hero[data-banner-carousel]');
    if (options.javaScriptEnabled !== false) {
      await page.locator('[data-banner-current]').waitFor();
      await page.mouse.move(0, 0);
      await page.clock.pauseAt(await page.evaluate(() => Date.now() + 500));
    }
    return { context, page, root, errors };
  };
  const index = async root => Number(await root.getAttribute('data-banner-current'));
  const select = async (root, desired) => {
    while (await index(root) !== desired) await root.locator('[data-banner-next]').click();
  };
  try {
    const { context, page, root, errors } = await create();
    const slides = root.locator('[data-banner-slide]');
    const total = await slides.count();
    assert.equal(await page.locator('#notices-title').count(), 0);
    assert.equal(await slides.first().locator('#hero-title').count(), 1);
    assert.equal(await root.locator('[data-banner-toggle], [data-banner-dot], [data-banner-count]').count(), 0);
    assert.equal(await root.locator('[data-banner-controls] button').count(), total > 1 ? 2 : 0);
    passed.push('Only the previous and next arrows remain in the top banner');

    if (total > 1) {
      assert.equal(await root.getAttribute('data-banner-playing'), 'true');
      let before = await index(root);
      await page.clock.fastForward(11000);
      assert.equal(await index(root), (before + 1) % total);
      passed.push('Autoplay starts without a play button');

      const next = root.locator('[data-banner-next]');
      const prev = root.locator('[data-banner-prev]');
      before = await index(root);
      await next.click();
      assert.equal(await index(root), (before + 1) % total);
      await prev.click();
      assert.equal(await index(root), before);
      await page.mouse.move(0, 0);
      assert.equal(await root.getAttribute('data-banner-playing'), 'true');
      await page.clock.fastForward(9500);
      assert.equal(await index(root), before);
      await page.clock.fastForward(600);
      assert.equal(await index(root), (before + 1) % total);
      passed.push('Arrow interaction resumes autoplay after a full ten-second reading interval');

      const current = await index(root);
      for (let i = 0; i < total; i++) {
        assert.equal(await slides.nth(i).evaluate(el => el.inert), i !== current);
        assert.equal(await slides.nth(i).getAttribute('aria-hidden'), String(i !== current));
        if (i !== current) {
          const link = slides.nth(i).locator('a').first();
          await link.evaluate(el => el.focus());
          assert.equal(await link.evaluate(el => el === document.activeElement), false);
        }
      }
      passed.push('Inactive banners cannot receive keyboard focus');

      await next.focus();
      before = await index(root);
      await page.keyboard.press('ArrowRight');
      assert.equal(await index(root), (before + 1) % total);
      assert.equal(await root.getAttribute('data-banner-playing'), 'false');
      before = await index(root);
      await page.clock.fastForward(21000);
      assert.equal(await index(root), before);
      await page.keyboard.press('Tab');
      assert.equal(await root.getAttribute('data-banner-playing'), 'true');
      passed.push('Keyboard arrows work and focus pauses autoplay until the user leaves');

      await root.locator('[data-banner-controls]').hover();
      before = await index(root);
      await page.clock.fastForward(21000);
      assert.equal(await index(root), before);
      await page.mouse.move(0, 0);
      await page.clock.fastForward(10100);
      assert.equal(await index(root), (before + 1) % total);
      passed.push('Hover pauses reading and leaving resumes rotation');

      await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange')); });
      before = await index(root);
      await page.clock.fastForward(21000);
      assert.equal(await index(root), before);
      await page.evaluate(() => { delete document.hidden; document.dispatchEvent(new Event('visibilitychange')); });
      await page.clock.fastForward(10100);
      assert.equal(await index(root), (before + 1) % total);
      passed.push('Inactive tabs pause and resume rotation');

      await select(root, total - 1);
      await next.click();
      assert.equal(await index(root), 0);
      const motion = await root.evaluate(el => ({
        trackTransform: getComputedStyle(el.querySelector('[data-banner-track]')).transform,
        slides: [...el.querySelectorAll('[data-banner-slide]')].map(slide => ({ x: slide.getBoundingClientRect().x, property: getComputedStyle(slide).transitionProperty, duration: getComputedStyle(slide).transitionDuration }))
      }));
      assert.equal(motion.trackTransform, 'none');
      assert.equal(new Set(motion.slides.map(slide => slide.x)).size, 1);
      for (const slide of motion.slides) { assert.match(slide.property, /opacity/); assert.equal(parseFloat(slide.duration), 1.2); }
      passed.push('All transitions including last-to-first use a 1.2-second crossfade');
    }
    assert.deepEqual(errors, []);
    await context.close();

    const reduced = await create({ reducedMotion: 'reduce' });
    for (const width of [1280, 1920]) {
      await reduced.page.setViewportSize({ width, height: 1000 });
      const height = (await reduced.root.boundingBox()).height;
      for (let i = 0; i < total; i++) {
        if (total > 1) await select(reduced.root, i);
        assert.equal((await reduced.root.boundingBox()).height, height);
        assert.equal(await reduced.page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
        const slideImage = reduced.root.locator('[data-banner-slide]').nth(i).locator('.hero__img, .hero__poster');
        assert.equal(Math.round((await slideImage.boundingBox()).width), 1600);
      }
      const frame = await reduced.root.locator('.hero__frame').boundingBox();
      if (total > 1) {
        const controls = await reduced.root.locator('[data-banner-controls]').boundingBox();
        assert.ok(Math.abs(controls.x - frame.x - 24) < 1);
        assert.ok(controls.y > frame.y + frame.height / 2);
      }
      assert.equal(await reduced.root.locator('[data-banner-viewport]').evaluate(el => getComputedStyle(el).borderTopLeftRadius), '24px');
    }
    passed.push('Desktop images keep their fixed width, rounded corners and lower-left arrows');
    const before = await index(reduced.root);
    await reduced.page.clock.fastForward(21000);
    assert.equal(await index(reduced.root), before);
    assert.equal(await reduced.root.getAttribute('data-banner-playing'), 'false');
    assert.equal(await reduced.root.locator('[data-banner-slide]').first().evaluate(el => getComputedStyle(el).transitionProperty), 'none');
    passed.push('Reduced motion disables automatic rotation and fades');

    for (const width of [320, 390]) {
      await reduced.page.setViewportSize({ width, height: 844 });
      const height = (await reduced.root.boundingBox()).height;
      for (let i = 0; i < total; i++) {
        if (total > 1) await select(reduced.root, i);
        const box = await reduced.root.locator('[data-banner-slide]').nth(i).locator('.hero__img, .hero__poster').boundingBox();
        const viewport = await reduced.root.locator('[data-banner-viewport]').boundingBox();
        assert.ok(box.x >= viewport.x - 1 && box.x + box.width <= viewport.x + viewport.width + 1);
        assert.ok(box.y >= viewport.y - 1 && box.y + box.height <= viewport.y + viewport.height + 1);
        assert.equal((await reduced.root.boundingBox()).height, height);
      }
      assert.equal(await reduced.root.locator('[data-banner-viewport]').evaluate(el => getComputedStyle(el).borderTopLeftRadius), '16px');
      assert.equal(await reduced.page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    }
    passed.push('Mobile shows complete images with stable height and rounded corners');
    assert.deepEqual(reduced.errors, []);
    await reduced.context.close();

    if (total > 1) {
      const touch = await create({ viewport: { width: 390, height: 844 }, hasTouch: true });
      const before = await index(touch.root);
      const clickAllowed = await touch.root.locator('[data-banner-viewport]').evaluate(el => {
        const start = new Touch({ identifier: 1, target: el, clientX: 300, clientY: 100 });
        const end = new Touch({ identifier: 1, target: el, clientX: 100, clientY: 100 });
        el.dispatchEvent(new TouchEvent('touchstart', { touches: [start], changedTouches: [start], bubbles: true }));
        el.dispatchEvent(new TouchEvent('touchend', { touches: [], changedTouches: [end], bubbles: true }));
        return el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      });
      assert.equal(clickAllowed, false);
      assert.equal(await index(touch.root), (before + 1) % total);
      assert.equal(await touch.root.getAttribute('data-banner-playing'), 'true');
      await touch.page.clock.fastForward(10100);
      assert.equal(await index(touch.root), (before + 2) % total);
      assert.deepEqual(touch.errors, []);
      await touch.context.close();
      passed.push('Touch swipe changes the banner, avoids accidental links and resumes autoplay');
    }
    const plain = await create({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
    for (const slide of await plain.root.locator('[data-banner-slide]').all()) assert.equal(await slide.isVisible(), true);
    assert.equal(await plain.root.locator('[data-banner-next]').isVisible(), false);
    await plain.context.close();
    passed.push('Without JavaScript all banners stay readable');
    console.log(JSON.stringify({ passed }, null, 2));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exit(1); });
