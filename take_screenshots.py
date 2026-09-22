import asyncio
import os
from playwright.async_api import async_playwright

OUTPUT_DIR = r"C:\Users\mujaw\Downloads\IOT\screenshots"
ARTIFACT_DIR = r"C:\Users\mujaw\.gemini\antigravity\brain\e9f9a431-81ba-4de2-9d7d-ccf391abeb61"
os.makedirs(OUTPUT_DIR, exist_ok=True)
os.makedirs(ARTIFACT_DIR, exist_ok=True)

async def capture():
    async with async_playwright() as p:
        try:
            browser = await p.chromium.launch(headless=True, channel="chrome")
        except Exception:
            browser = await p.chromium.launch(headless=True)

        context = await browser.new_context(
            viewport={"width": 1440, "height": 900},
            device_scale_factor=2
        )
        page = await context.new_page()

        # 1. PC-A Dashboard (Fleet Overview with Wokwi boards)
        print("Capturing PC-A Dashboard...")
        await page.goto("http://localhost:5173", wait_until="networkidle")
        await asyncio.sleep(2)
        p1 = os.path.join(OUTPUT_DIR, "pc_a_dashboard_fleet.png")
        p1_art = os.path.join(ARTIFACT_DIR, "pc_a_dashboard_fleet.png")
        await page.screenshot(path=p1)
        await page.screenshot(path=p1_art)
        print(f"Saved: {p1}")

        # 2. PC-A Dashboard (Analytics Tab)
        print("Capturing PC-A Analytics Dashboard...")
        analytics_tab = page.locator("text=Analytics").first
        if await analytics_tab.count() > 0:
            await analytics_tab.click()
            await asyncio.sleep(1.5)
            p_an = os.path.join(OUTPUT_DIR, "pc_a_dashboard_analytics.png")
            p_an_art = os.path.join(ARTIFACT_DIR, "pc_a_dashboard_analytics.png")
            await page.screenshot(path=p_an)
            await page.screenshot(path=p_an_art)
            print(f"Saved: {p_an}")

        # 3. PC-A Dashboard (Firmware Diff Modal)
        print("Capturing PC-A Firmware Diff Modal...")
        await page.locator("text=Fleet").first.click()
        await asyncio.sleep(0.5)
        diff_btn = page.locator("text=C++ Diff Viewer").first
        if await diff_btn.count() > 0:
            await diff_btn.click()
            await asyncio.sleep(1.5)
            p_diff = os.path.join(OUTPUT_DIR, "pc_a_dashboard_diff.png")
            p_diff_art = os.path.join(ARTIFACT_DIR, "pc_a_dashboard_diff.png")
            await page.screenshot(path=p_diff)
            await page.screenshot(path=p_diff_art)
            print(f"Saved: {p_diff}")
            close_diff = page.locator("text=Close Diff Inspector").first
            if await close_diff.count() > 0:
                await close_diff.click()
            else:
                await page.keyboard.press("Escape")
            await asyncio.sleep(1)

        # 4. PC-A Multi-Stage Batch OTA Pipeline Modal
        print("Capturing PC-A Batch OTA Pipeline Modal...")
        await page.goto("http://localhost:5173", wait_until="networkidle")
        await asyncio.sleep(1)
        # Click checkboxes on first two devices
        boxes = page.locator("div.w-5.h-5")
        if await boxes.count() >= 2:
            await boxes.nth(0).click()
            await boxes.nth(1).click()
            await asyncio.sleep(0.5)
        push_btn = page.locator("text=Push OTA").first
        if await push_btn.count() > 0:
            await push_btn.click()
            await asyncio.sleep(1)
            # Click Start Pipeline to capture active telemetry in progress
            start_btn = page.locator("text=Start Pipeline").first
            if await start_btn.count() > 0:
                await start_btn.click()
                await asyncio.sleep(1.5)
            p_ota = os.path.join(OUTPUT_DIR, "pc_a_dashboard_batch_pipeline.png")
            p_ota_art = os.path.join(ARTIFACT_DIR, "pc_a_dashboard_batch_pipeline.png")
            await page.screenshot(path=p_ota)
            await page.screenshot(path=p_ota_art)
            print(f"Saved: {p_ota}")

        # 5. PC-B Simulator (Home Grid with Wokwi ESP32 boards)
        print("Capturing PC-B Simulator Grid...")
        await page.goto("http://localhost:3000", wait_until="networkidle")
        await asyncio.sleep(2)
        p3 = os.path.join(OUTPUT_DIR, "pc_b_simulator_grid.png")
        p3_art = os.path.join(ARTIFACT_DIR, "pc_b_simulator_grid.png")
        await page.screenshot(path=p3)
        await page.screenshot(path=p3_art)
        print(f"Saved: {p3}")

        # 6. PC-B Simulator (LED Device Detail with Wokwi 5mm LED)
        print("Capturing PC-B LED Device Detail...")
        await page.goto("http://localhost:3000/device/ESP-A1F3", wait_until="networkidle")
        await asyncio.sleep(2)
        p4 = os.path.join(OUTPUT_DIR, "pc_b_simulator_led_detail.png")
        p4_art = os.path.join(ARTIFACT_DIR, "pc_b_simulator_led_detail.png")
        await page.screenshot(path=p4)
        await page.screenshot(path=p4_art)
        print(f"Saved: {p4}")

        # 7. PC-B Simulator (LCD Device Detail with Wokwi 1602 LCD)
        print("Capturing PC-B LCD Device Detail...")
        await page.goto("http://localhost:3000/device/ESP-B2C4", wait_until="networkidle")
        await asyncio.sleep(2)
        p5 = os.path.join(OUTPUT_DIR, "pc_b_simulator_lcd_detail.png")
        p5_art = os.path.join(ARTIFACT_DIR, "pc_b_simulator_lcd_detail.png")
        await page.screenshot(path=p5)
        await page.screenshot(path=p5_art)
        print(f"Saved: {p5}")

        await browser.close()
        print("All enhanced screenshots successfully captured!")

if __name__ == "__main__":
    asyncio.run(capture())
