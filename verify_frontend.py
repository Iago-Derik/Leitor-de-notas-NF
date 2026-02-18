from playwright.sync_api import sync_playwright
import os
import time

def verify_invoice_system():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        
        # Load the index.html file
        # Using file protocol
        cwd = os.getcwd()
        page.goto(f"file://{cwd}/index.html")
        
        print("Page loaded.")
        
        # 1. Check Payment Methods
        payment_select = page.locator("#paymentMethod")
        # Check if options exist
        # We need to wait a bit if JS is slow, but it should be fast.
        # Check specific option text presence
        # paymentMethods: ["Boleto Bancário", ...]
        
        options_text = payment_select.inner_text()
        if "Boleto Bancário" in options_text:
            print("Payment methods populated.")
        else:
            print("Error: Payment methods not populated.")
            
        # 2. Simulate File Upload
        # Create a dummy file
        with open("/tmp/test.xml", "w") as f:
            f.write("dummy content")
            
        file_input = page.locator("#fileInput")
        file_input.set_input_files("/tmp/test.xml")
        print("File uploaded.")
        
        # Wait for loader to appear and then disappear (simulated delay 2s)
        try:
            page.wait_for_selector("#loader", state="visible", timeout=1000)
            print("Loader visible.")
            
            # The simulation takes 2000ms
            page.wait_for_selector("#loader", state="hidden", timeout=5000)
            print("Loader hidden.")
            
            # 3. Check if fields are populated
            # Check for 'numeroNota' input value. Mock data has "123456"
            numero_nota = page.locator("#numeroNota")
            val = numero_nota.input_value()
            print(f"Numero Nota: {val}")
            
            if val == "123456":
                print("Fields populated correctly.")
            else:
                print(f"Error: Fields not populated correctly. Expected 123456, got '{val}'")
                
            # 4. Check Badges
            # Look for .badge-auto
            badges = page.locator(".badge-auto")
            count = badges.count()
            if count > 0:
                print(f"Auto badges found: {count}")
            else:
                print("Error: No auto badges found.")
                
        except Exception as e:
            print(f"Verification failed: {e}")
            
        # Take screenshot
        screenshot_path = "/home/jules/verification/invoice_system.png"
        page.screenshot(path=screenshot_path)
        print(f"Screenshot saved to {screenshot_path}")
        
        browser.close()

if __name__ == "__main__":
    verify_invoice_system()
