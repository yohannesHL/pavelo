/**
 * Rightmove Property Scraper
 * 
 * Scrapes 10 property listings from Rightmove search results.
 * Extracts structured data: title, price, address, bedrooms, bathrooms,
 * description, images, features, agent, listing URL.
 * 
 * Usage: npx tsx scripts/scrape-rightmove.ts
 * 
 * Output: scripts/output/rightmove-listings.json
 */

import { chromium, type Page } from "playwright";
import * as fs from "fs";
import * as path from "path";

interface PropertyListing {
  id: string;
  title: string;
  price: number;
  priceText: string;
  address: string;
  bedrooms: number;
  bathrooms: number;
  description: string;
  features: string[];
  images: string[];
  agent: string;
  listingUrl: string;
  propertyType: string;
  scrapedAt: string;
}

async function scrapeRightmove(): Promise<PropertyListing[]> {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  });
  const page = await context.newPage();

  // Search for properties in London
  const searchUrl = "https://www.rightmove.co.uk/property-for-sale/find.html?locationIdentifier=REGION%5E87490&maxBedrooms=4&minBedrooms=2&maxPrice=750000&minPrice=200000&propertyTypes=&includeSSTC=false&mustHave=&dontShow=&furnishTypes=&keywords=";
  
  console.log("Navigating to Rightmove search...");
  await page.goto(searchUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
  
  // Wait for results
  await page.waitForSelector(".l-searchResult", { timeout: 15000 }).catch(() => {
    console.log("No .l-searchResult found, trying alternative selector...");
  });

  const listings: PropertyListing[] = [];
  
  // Get first 10 listing links
  const listingCards = await page.$$(".l-searchResult");
  const cardCount = Math.min(listingCards.length, 10);
  
  console.log(`Found ${listingCards.length} results, scraping first ${cardCount}...`);

  for (let i = 0; i < cardCount; i++) {
    try {
      const card = listingCards[i];
      
      // Extract from search result card
      const linkEl = await card.$("a.propertyCard-link");
      const href = linkEl ? await linkEl.getAttribute("href") : null;
      if (!href) continue;

      const fullUrl = href.startsWith("http") ? href : `https://www.rightmove.co.uk${href}`;
      
      // Extract basic info from card
      const priceText = await card.$eval(".propertyCard-priceValue", el => el.textContent?.trim() || "").catch(() => "");
      const address = await card.$eval(".propertyCard-address", el => el.textContent?.trim() || "").catch(() => "");
      const description = await card.$eval(".propertyCard-description span", el => el.textContent?.trim() || "").catch(() => "");
      const agent = await card.$eval(".propertyCard-branchLogo-kicker", el => el.textContent?.trim() || "").catch(() => "");

      // Parse price
      const priceNum = parseInt(priceText.replace(/[£,]/g, "")) || 0;

      // Navigate to detail page for more info
      const detailPage = await context.newPage();
      await detailPage.goto(fullUrl, { waitUntil: "domcontentloaded", timeout: 20000 });
      
      // Extract details
      const title = await detailPage.$eval("h1", el => el.textContent?.trim() || "").catch(() => address);
      
      const bedroomsText = await detailPage.$eval('[data-testid="beds-label"] + span, .ksc_launchBox:has-text("bedroom")', el => el.textContent?.trim() || "0").catch(() => "0");
      const bedrooms = parseInt(bedroomsText) || 0;
      
      const bathroomsText = await detailPage.$eval('[data-testid="baths-label"] + span, .ksc_launchBox:has-text("bathroom")', el => el.textContent?.trim() || "0").catch(() => "0");
      const bathrooms = parseInt(bathroomsText) || 0;

      const features = await detailPage.$$eval(".lIhZ24u1NHMa5Y6gDH90A li, ._2Pr4092dZUG6t1_MyGPRoL li", els => 
        els.map(el => el.textContent?.trim() || "").filter(Boolean).slice(0, 10)
      ).catch(() => [] as string[]);

      const images = await detailPage.$$eval("img[src*='media.rightmove']", els =>
        els.map(el => el.getAttribute("src") || "").filter(Boolean).slice(0, 5)
      ).catch(() => [] as string[]);

      const propertyType = await detailPage.$eval('[data-testid="property-type"]', el => el.textContent?.trim() || "").catch(() => "Unknown");

      // Extract full description  
      const fullDescription = await detailPage.$eval('[data-testid="truncated_description_content"], .STw8udCxUaBUMfOhkIYvu', el => el.textContent?.trim() || "").catch(() => description);

      await detailPage.close();

      const listing: PropertyListing = {
        id: `rm-${Date.now()}-${i}`,
        title,
        price: priceNum,
        priceText,
        address,
        bedrooms,
        bathrooms,
        description: fullDescription || description,
        features,
        images,
        agent,
        listingUrl: fullUrl,
        propertyType,
        scrapedAt: new Date().toISOString(),
      };

      listings.push(listing);
      console.log(`  [${i + 1}/${cardCount}] ${address} — ${priceText}`);
      
      // Be polite
      await page.waitForTimeout(1000);
    } catch (err) {
      console.warn(`  [${i + 1}] Failed to scrape listing:`, (err as Error).message);
    }
  }

  await browser.close();
  return listings;
}

async function main() {
  console.log("🏠 Rightmove Property Scraper\n");

  const listings = await scrapeRightmove();
  
  // Save output
  const outDir = path.join(__dirname, "output");
  fs.mkdirSync(outDir, { recursive: true });
  
  const outPath = path.join(outDir, "rightmove-listings.json");
  fs.writeFileSync(outPath, JSON.stringify(listings, null, 2));
  
  console.log(`\n✅ Scraped ${listings.length} listings → ${outPath}`);
}

main().catch(console.error);
