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

        # 1. PC-A Dashboard Home (Standard 1440x900)
        print("Capturing PC-A Dashboard Home (1440x900)...")
        await page.goto("http://localhost:5173", wait_until="networkidle")
        await asyncio.sleep(2)
        p1 = os.path.join(OUTPUT_DIR, "pc_a_dashboard_home.png")
        p1_art = os.path.join(ARTIFACT_DIR, "pc_a_dashboard_home.png")
        await page.screenshot(path=p1)
        await page.screenshot(path=p1_art)
        print(f"Saved: {p1}")

        # 1a. PC-A Device Details Overlay Modal Card
        print("Capturing PC-A Device Details Modal Card...")
        details_btn = page.locator("text=Details").first
        if await details_btn.count() > 0:
            await details_btn.click()
            await asyncio.sleep(1)
            p_dev = os.path.join(OUTPUT_DIR, "pc_a_dashboard_device_panel.png")
            p_dev_art = os.path.join(ARTIFACT_DIR, "pc_a_dashboard_device_panel.png")
            await page.screenshot(path=p_dev)
            await page.screenshot(path=p_dev_art)
            print(f"Saved: {p_dev}")
            # Close modal by clicking ✕
            close_btn = page.locator("text=✕").first
            if await close_btn.count() > 0:
                await close_btn.click()
            await asyncio.sleep(0.5)

        # 1b. PC-A Analytics Page (Standard 1440x900)
        print("Capturing PC-A Analytics Page (1440x900)...")
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

        # 1c. Test on Laptop Browser dimensions (1366 x 680, DPR 1.25)
        print("Capturing PC-A Laptop Browser Mode (1366x680, DPR 1.25)...")
        laptop_ctx = await browser.new_context(
            viewport={"width": 1366, "height": 680},
            device_scale_factor=1.25
        )
        laptop_page = await laptop_ctx.new_page()
        await laptop_page.goto("http://localhost:5173", wait_until="networkidle")
        await asyncio.sleep(2)
        p_lap = os.path.join(OUTPUT_DIR, "pc_a_dashboard_laptop_680h.png")
        p_lap_art = os.path.join(ARTIFACT_DIR, "pc_a_dashboard_laptop_680h.png")
        await laptop_page.screenshot(path=p_lap)
        await laptop_page.screenshot(path=p_lap_art)
        print(f"Saved: {p_lap}")
        await laptop_ctx.close()

        # 1d. Test on Large Desktop dimensions (1920 x 1080, DPR 1.0)
        print("Capturing PC-A Large Desktop Mode (1920x1080, DPR 1.0)...")
        desktop_ctx = await browser.new_context(
            viewport={"width": 1920, "height": 1080},
            device_scale_factor=1.0
        )
        desktop_page = await desktop_ctx.new_page()
        await desktop_page.goto("http://localhost:5173", wait_until="networkidle")
        await asyncio.sleep(2)
        p_desk = os.path.join(OUTPUT_DIR, "pc_a_dashboard_desktop_1080p.png")
        p_desk_art = os.path.join(ARTIFACT_DIR, "pc_a_dashboard_desktop_1080p.png")
        await desktop_page.screenshot(path=p_desk)
        await desktop_page.screenshot(path=p_desk_art)
        print(f"Saved: {p_desk}")
        await desktop_ctx.close()

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
