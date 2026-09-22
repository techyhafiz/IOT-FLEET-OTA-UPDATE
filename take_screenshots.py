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

        # 1. PC-A Dashboard (Home Overview with top stats, donut chart, devices, logs table)
        print("Capturing PC-A Dashboard Home...")
        await page.goto("http://localhost:5173", wait_until="networkidle")
        await asyncio.sleep(2)
        p1 = os.path.join(OUTPUT_DIR, "pc_a_dashboard_home.png")
        p1_art = os.path.join(ARTIFACT_DIR, "pc_a_dashboard_home.png")
        await page.screenshot(path=p1)
        await page.screenshot(path=p1_art)
        print(f"Saved: {p1}")

        # 1b. PC-A Analytics Page
        print("Capturing PC-A Analytics Page...")
        analytics_btn = page.locator("text=Analytics").first
        if await analytics_btn.count() > 0:
            await analytics_btn.click()
            await asyncio.sleep(1.5)
            p_an = os.path.join(OUTPUT_DIR, "pc_a_dashboard_analytics.png")
            p_an_art = os.path.join(ARTIFACT_DIR, "pc_a_dashboard_analytics.png")
            await page.screenshot(path=p_an)
            await page.screenshot(path=p_an_art)
            print(f"Saved: {p_an}")
            # Switch back to Home
            home_btn = page.locator("text=Home").first
            if await home_btn.count() > 0:
                await home_btn.click()
                await asyncio.sleep(0.5)

        # 2. PC-A Update Firmware Popup Modal
        print("Capturing PC-A Update Firmware Popup...")
        # Select first device and click Update Firmware
        up_btn = page.locator("text=Update Firmware").first
        if await up_btn.count() > 0:
            await up_btn.click()
            await asyncio.sleep(1)
            p_popup = os.path.join(OUTPUT_DIR, "pc_a_dashboard_update_popup.png")
            p_popup_art = os.path.join(ARTIFACT_DIR, "pc_a_dashboard_update_popup.png")
            await page.screenshot(path=p_popup)
            await page.screenshot(path=p_popup_art)
            print(f"Saved: {p_popup}")
            # Close modal
            cancel_btn = page.locator("text=Cancel").first
            if await cancel_btn.count() > 0:
                await cancel_btn.click()
            await asyncio.sleep(0.5)

        # 3. PC-A Firmware Repository Tab
        print("Capturing PC-A Firmware Tab...")
        fw_tab = page.locator("text=Firmware").first
        if await fw_tab.count() > 0:
            await fw_tab.click()
            await asyncio.sleep(1.5)
            p_fw = os.path.join(OUTPUT_DIR, "pc_a_dashboard_firmware.png")
            p_fw_art = os.path.join(ARTIFACT_DIR, "pc_a_dashboard_firmware.png")
            await page.screenshot(path=p_fw)
            await page.screenshot(path=p_fw_art)
            print(f"Saved: {p_fw}")

            # 4. Upload Modal with Progress Bar
            print("Capturing PC-A Firmware Upload with Validation...")
            upload_btn = page.locator("text=Upload New Firmware").first
            if await upload_btn.count() > 0:
                await upload_btn.click()
                await asyncio.sleep(0.5)
                # Load sample C file
                sample_btn = page.locator("text=Load Sample C File").first
                if await sample_btn.count() > 0:
                    await sample_btn.click()
                    await asyncio.sleep(0.5)
                # Trigger Upload & Validate to show progress bar
                val_btn = page.locator("text=Upload & Validate").first
                if await val_btn.count() > 0:
                    await val_btn.click()
                    await asyncio.sleep(0.5)
                p_val = os.path.join(OUTPUT_DIR, "pc_a_dashboard_firmware_upload.png")
                p_val_art = os.path.join(ARTIFACT_DIR, "pc_a_dashboard_firmware_upload.png")
                await page.screenshot(path=p_val)
                await page.screenshot(path=p_val_art)
                print(f"Saved: {p_val}")
                await asyncio.sleep(1.5)

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

        await browser.close()
        print("All screenshots successfully captured!")

if __name__ == "__main__":
    asyncio.run(capture())
