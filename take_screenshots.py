import asyncio
import os
from playwright.async_api import async_playwright

OUTPUT_DIR = r"C:\Users\mujaw\Downloads\IOT\screenshots"
ARTIFACT_DIR = r"C:\Users\mujaw\.gemini\antigravity\brain\e9f9a431-81ba-4de2-9d7d-ccf391abeb61"
os.makedirs(OUTPUT_DIR, exist_ok=True)
os.makedirs(ARTIFACT_DIR, exist_ok=True)

async def capture():
    async with async_playwright() as p:
        # Launch browser using installed Chrome or bundled Chromium
        try:
            browser = await p.chromium.launch(headless=True, channel="chrome")
        except Exception:
            browser = await p.chromium.launch(headless=True)

        context = await browser.new_context(
            viewport={"width": 1440, "height": 900},
            device_scale_factor=2
        )
        page = await context.new_page()

        # 1. PC-A Dashboard (Fleet Overview)
        print("Capturing PC-A Dashboard...")
        await page.goto("http://localhost:5173", wait_until="networkidle")
        await asyncio.sleep(2)
        p1 = os.path.join(OUTPUT_DIR, "pc_a_dashboard_fleet.png")
        p1_art = os.path.join(ARTIFACT_DIR, "pc_a_dashboard_fleet.png")
        await page.screenshot(path=p1)
        await page.screenshot(path=p1_art)
        print(f"Saved: {p1}")

        # 2. PC-A Dashboard (Device Panel Open)
        print("Capturing PC-A Dashboard Device Panel...")
        card = page.locator("text=ESP-A1F3").first
        if await card.count() > 0:
            await card.click()
            await asyncio.sleep(1)
            p2 = os.path.join(OUTPUT_DIR, "pc_a_dashboard_device_panel.png")
            p2_art = os.path.join(ARTIFACT_DIR, "pc_a_dashboard_device_panel.png")
            await page.screenshot(path=p2)
            await page.screenshot(path=p2_art)
            print(f"Saved: {p2}")

        # 3. PC-B Simulator (Home Device Grid)
        print("Capturing PC-B Simulator...")
        await page.goto("http://localhost:3000", wait_until="networkidle")
        await asyncio.sleep(2)
        p3 = os.path.join(OUTPUT_DIR, "pc_b_simulator_grid.png")
        p3_art = os.path.join(ARTIFACT_DIR, "pc_b_simulator_grid.png")
        await page.screenshot(path=p3)
        await page.screenshot(path=p3_art)
        print(f"Saved: {p3}")

        # 4. PC-B Simulator (LED Device Detail)
        print("Capturing PC-B LED Device Detail...")
        await page.goto("http://localhost:3000/device/ESP-A1F3", wait_until="networkidle")
        await asyncio.sleep(2)
        p4 = os.path.join(OUTPUT_DIR, "pc_b_simulator_led_detail.png")
        p4_art = os.path.join(ARTIFACT_DIR, "pc_b_simulator_led_detail.png")
        await page.screenshot(path=p4)
        await page.screenshot(path=p4_art)
        print(f"Saved: {p4}")

        # 5. PC-B Simulator (LCD Device Detail)
        print("Capturing PC-B LCD Device Detail...")
        await page.goto("http://localhost:3000/device/ESP-B2C4", wait_until="networkidle")
        await asyncio.sleep(2)
        p5 = os.path.join(OUTPUT_DIR, "pc_b_simulator_lcd_detail.png")
        p5_art = os.path.join(ARTIFACT_DIR, "pc_b_simulator_lcd_detail.png")
        await page.screenshot(path=p5)
        await page.screenshot(path=p5_art)
        print(f"Saved: {p5}")

        # 6. PC-B Simulator (C++ Code Viewer Modal)
        print("Capturing PC-B C++ Code Viewer...")
        code_btn = page.locator("text=View C++ Code").first
        if await code_btn.count() > 0:
            await code_btn.click()
            await asyncio.sleep(1)
            p6 = os.path.join(OUTPUT_DIR, "pc_b_simulator_code_viewer.png")
            p6_art = os.path.join(ARTIFACT_DIR, "pc_b_simulator_code_viewer.png")
            await page.screenshot(path=p6)
            await page.screenshot(path=p6_art)
            print(f"Saved: {p6}")

        await browser.close()
        print("All screenshots successfully captured!")

if __name__ == "__main__":
    asyncio.run(capture())
