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
    const root = page.locator('.hero[data-banner-carousel][data-banner-current]');
    await root.waitFor();
    await root.scrollIntoViewIfNeeded();
    await page.mouse.move(0, 0);
    await page.clock.pauseAt(await page.evaluate(() => Date.now() + 500));
    const slides = root.locator('[data-banner-slide]');
    const total = await slides.count();
    const count = root.locator('[data-banner-count]');
    const index = async () => Number((await count.innerText()).split('/')[0].trim()) - 1;
    const dots = root.locator('[data-banner-dot]');
    const toggle = root.locator('[data-banner-toggle]');
    assert.equal(await page.locator('#notices-title').count(), 0);
    assert.equal(await root.evaluate(element => element === document.querySelector('main')?.firstElementChild), true);
    assert.equal(await slides.first().locator('#hero-title').count(), 1);
    assert.equal(await slides.first().locator('.hero__img').count(), 1);
    assert.equal(await slides.locator('.hero__poster').count(), total - 1);
    passed.push('Church introduction and notices share the top banner without a separate news section');
    if (total > 1) {
      let before = await index();
      await root.locator('[data-banner-next]').click();
      assert.equal(await index(), (before + 1) % total);
      assert.match(await toggle.innerText(), /자동 재생/);
      await root.locator('[data-banner-prev]').click();
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

      await root.locator('[data-banner-next]').focus();
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
      await slides.nth(await index()).locator('a:visible').last().focus();
      before = await index();
      await page.clock.fastForward(7000);
      assert.equal(await index(), before);
      assert.match(await toggle.innerText(), /자동 재생/);
      passed.push('Hover pauses temporarily and keyboard focus stops rotation');
    } else {
      assert.equal(await root.locator('[data-banner-next]').isVisible(), false);
      skipped.push('Multiple-slide interactions: only the church introduction remains');
      passed.push('Single banner does not show unnecessary navigation');
    }

    for (const width of [1280, 1920]) {
      await page.setViewportSize({ width, height: 1000 });
      const height = (await root.boundingBox()).height;
      for (const picture of await root.locator('.hero__img, .hero__poster').all()) {
        assert.equal(Math.round((await picture.boundingBox()).width), 1600, `Banner image width at ${width}px`);
      }
      for (let i = 0; i < total; i++) {
        if (total > 1) await dots.nth(i).click();
        assert.equal((await root.boundingBox()).height, height, `Banner height at ${width}px, slide ${i + 1}`);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      }
    }
    passed.push('Desktop images retain their fixed width and slide changes preserve banner height without overflow');
    assert.deepEqual(errors, []);
    await context.close();

    const reduced = await createPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
    const reducedRoot = reduced.page.locator('.hero[data-banner-carousel][data-banner-current]');
    await reducedRoot.waitFor();
    await reducedRoot.scrollIntoViewIfNeeded();
    if (total > 1) {
      const selected = await reducedRoot.locator('[data-banner-count]').innerText();
      assert.match(await reducedRoot.locator('[data-banner-toggle]').innerText(), /자동 재생/);
      await reduced.page.clock.fastForward(13000);
      assert.equal(await reducedRoot.locator('[data-banner-count]').innerText(), selected);
      await reducedRoot.locator('[data-banner-next]').click();
      assert.notEqual(await reducedRoot.locator('[data-banner-count]').innerText(), selected);
      assert.equal(await reducedRoot.locator('[data-banner-track]').evaluate(element => getComputedStyle(element).transitionProperty), 'none');
      passed.push('Reduced motion disables automatic rotation and animated transitions');
    }
    const mobileHeight = (await reducedRoot.boundingBox()).height;
    const mobileSlides = reducedRoot.locator('[data-banner-slide]');
    for (let i = 0; i < total; i++) {
      if (total > 1) await reducedRoot.locator('[data-banner-dot]').nth(i).click();
      const image = mobileSlides.nth(i).locator('.hero__img, .hero__poster');
      const box = await image.boundingBox();
      const viewport = await reducedRoot.locator('[data-banner-viewport]').boundingBox();
      assert.ok(box.x >= viewport.x - 1 && box.x + box.width <= viewport.x + viewport.width + 1, `Mobile image ${i + 1} fits horizontally`);
      assert.ok(box.y >= viewport.y - 1 && box.y + box.height <= viewport.y + viewport.height + 1, `Mobile image ${i + 1} fits vertically`);
      if (i > 0) assert.equal(await image.evaluate(element => getComputedStyle(element).objectFit), 'contain');
      assert.equal((await reducedRoot.boundingBox()).height, mobileHeight);
    }
    passed.push('Mobile displays complete images within a stable-height banner');
    assert.equal(await reduced.page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    assert.deepEqual(reduced.errors, []);
    await reduced.context.close();

    const plain = await createPage({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
    const plainSlides = plain.page.locator('[data-banner-slide]');
    assert.equal(await plainSlides.count(), total);
    for (const slide of await plainSlides.all()) assert.equal(await slide.isVisible(), true);
    assert.equal(await plain.page.locator('[data-banner-next]').isVisible(), false);
    passed.push('Without JavaScript every banner remains readable');
    await plain.context.close();
    console.log(JSON.stringify({ passed, skipped }, null, 2));
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exit(1); });
