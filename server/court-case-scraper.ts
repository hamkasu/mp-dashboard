/**
 * Court Case News Scraper Service
 * Monitors Malaysian news sources for court case updates involving MPs
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import { GoogleGenAI } from "@google/genai";
import { getDb } from "./db";
import { 
  courtCaseNewsArticles, 
  mps, 
  courtCases,
  InsertCourtCaseNewsArticle 
} from "@shared/schema";
import { eq, or, desc } from "drizzle-orm";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

// Malaysian news sources to monitor for court case news
const NEWS_SOURCES = [
  {
    name: "The Star",
    baseUrl: "https://www.thestar.com.my",
    searchUrl: "https://www.thestar.com.my/search?q=",
    keywords: [
      "court case MP", "corruption MP", "trial MP Malaysia", "charged MP",
      "defamation suit MP", "civil lawsuit MP", "libel suit politician", 
      "sexual assault suit MP", "harassment suit politician"
    ],
  },
  {
    name: "New Straits Times",
    baseUrl: "https://www.nst.com.my",
    searchUrl: "https://www.nst.com.my/search?keys=",
    keywords: [
      "court case MP", "corruption charges", "MACC investigation",
      "defamation lawsuit Malaysia", "civil suit politician", "libel case MP"
    ],
  },
  {
    name: "Malay Mail",
    baseUrl: "https://www.malaymail.com",
    searchUrl: "https://www.malaymail.com/search?q=",
    keywords: [
      "MP court case", "corruption trial", "charged politician Malaysia", "MACC",
      "defamation suit", "civil lawsuit politician", "sexual assault civil suit"
    ],
  },
  {
    name: "Benar News",
    baseUrl: "https://www.benarnews.org",
    searchUrl: "https://www.benarnews.org/malay/search?q=",
    keywords: [
      "MP court Malaysia", "corruption charges", "trial politician",
      "defamation MP", "lawsuit politician Malaysia"
    ],
  },
  {
    name: "Malaysiakini",
    baseUrl: "https://www.malaysiakini.com",
    searchUrl: "https://www.malaysiakini.com/en/search?q=",
    keywords: [
      "MP court", "corruption trial", "SPRM investigation",
      "defamation suit", "civil lawsuit", "libel suit", "sexual assault lawsuit"
    ],
  },
  {
    name: "Free Malaysia Today",
    baseUrl: "https://www.freemalaysiatoday.com",
    searchUrl: "https://www.freemalaysiatoday.com/?s=",
    keywords: [
      "MP charged", "court case politician", "corruption Malaysia",
      "defamation suit politician", "civil lawsuit MP", "libel Malaysia"
    ],
  },
];

// List of known MP names for matching
let mpNamesList: string[] = [];
let mpNamesMap: Map<string, { id: string; name: string; constituency: string }> = new Map();

interface ScrapedArticle {
  sourceUrl: string;
  sourceName: string;
  headline: string;
  content: string;
  publishedDate?: Date;
}

interface ExtractedCourtCaseData {
  mpName?: string;
  mpId?: string;
  caseNumber?: string;
  title?: string;
  courtLevel?: string;
  status?: string;
  caseType?: string;
  charges?: string;
  outcome?: string;
  filingDate?: string;
}

export class CourtCaseScraper {
  private headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
  };

  /**
   * Initialize the scraper with current MP list
   */
  async initialize() {
    try {
      const db = getDb();
      const allMps = await db.select().from(mps);
      mpNamesList = allMps.map(mp => mp.name);
      mpNamesMap = new Map(
        allMps.map(mp => [
          mp.name.toLowerCase(),
          { id: mp.id, name: mp.name, constituency: mp.constituency }
        ])
      );
      console.log(`[CourtCaseScraper] Initialized with ${mpNamesList.length} MPs`);
    } catch (error) {
      console.error("[CourtCaseScraper] Failed to initialize MP list:", error);
    }
  }

  /**
   * Scrape articles from a specific news source
   */
  private async scrapeNewsSource(source: typeof NEWS_SOURCES[0]): Promise<ScrapedArticle[]> {
    const articles: ScrapedArticle[] = [];
    
    for (const keyword of source.keywords) {
      try {
        await this.delay(1000); // Polite throttling
        
        const searchUrl = `${source.searchUrl}${encodeURIComponent(keyword)}`;
        console.log(`[CourtCaseScraper] Searching ${source.name} for: ${keyword}`);
        
        const response = await axios.get(searchUrl, {
          headers: this.headers,
          timeout: 30000,
        });
        
        const $ = cheerio.load(response.data);
        
        // Extract article links (selectors vary by site)
        const articleLinks = this.extractArticleLinks($, source.name);
        
        // Limit to first 5 articles per keyword
        for (const link of articleLinks.slice(0, 5)) {
          try {
            const articleUrl = link.startsWith('http') ? link : `${source.baseUrl}${link}`;
            
            // Check if already scraped
            const db = getDb();
            const existing = await db.select()
              .from(courtCaseNewsArticles)
              .where(eq(courtCaseNewsArticles.sourceUrl, articleUrl))
              .limit(1);
            
            if (existing.length > 0) {
              console.log(`[CourtCaseScraper] Already scraped: ${articleUrl}`);
              continue;
            }
            
            await this.delay(500);
            const article = await this.scrapeArticle(articleUrl, source.name);
            if (article && this.isRelevantArticle(article)) {
              articles.push(article);
            }
          } catch (err) {
            console.error(`[CourtCaseScraper] Failed to scrape article: ${link}`, err);
          }
        }
      } catch (error) {
        console.error(`[CourtCaseScraper] Failed to search ${source.name} for "${keyword}":`, error);
      }
    }
    
    return articles;
  }

  /**
   * Extract article links from search results page
   */
  private extractArticleLinks($: cheerio.CheerioAPI, sourceName: string): string[] {
    const links: string[] = [];
    
    switch (sourceName) {
      case "The Star":
        $('a[href*="/news/"]').each((_, el) => {
          const href = $(el).attr('href');
          if (href && !links.includes(href)) links.push(href);
        });
        break;
      case "New Straits Times":
        $('a[href*="/news/"]').each((_, el) => {
          const href = $(el).attr('href');
          if (href && !links.includes(href)) links.push(href);
        });
        break;
      case "Malay Mail":
        $('a[href*="/news/"]').each((_, el) => {
          const href = $(el).attr('href');
          if (href && !links.includes(href)) links.push(href);
        });
        $('a[href*="/malaysia/"]').each((_, el) => {
          const href = $(el).attr('href');
          if (href && !links.includes(href)) links.push(href);
        });
        break;
      case "Benar News":
        $('a[href*="/malay/berita/"]').each((_, el) => {
          const href = $(el).attr('href');
          if (href && !links.includes(href)) links.push(href);
        });
        $('a[href*="/english/news/"]').each((_, el) => {
          const href = $(el).attr('href');
          if (href && !links.includes(href)) links.push(href);
        });
        break;
      case "Malaysiakini":
        $('a[href*="/news/"]').each((_, el) => {
          const href = $(el).attr('href');
          if (href && !links.includes(href)) links.push(href);
        });
        break;
      case "Free Malaysia Today":
        $('a[href*="/category/nation/"]').each((_, el) => {
          const href = $(el).attr('href');
          if (href && !links.includes(href)) links.push(href);
        });
        break;
      default:
        $('article a, .article-link, .news-item a').each((_, el) => {
          const href = $(el).attr('href');
          if (href && !links.includes(href)) links.push(href);
        });
    }
    
    return links.filter(link => 
      link && 
      !link.includes('#') && 
      !link.includes('javascript:') &&
      link.length > 10
    );
  }

  /**
   * Scrape a single article page
   */
  private async scrapeArticle(url: string, sourceName: string): Promise<ScrapedArticle | null> {
    try {
      const response = await axios.get(url, {
        headers: this.headers,
        timeout: 30000,
      });
      
      const $ = cheerio.load(response.data);
      
      // Remove script and style elements
      $('script, style, nav, footer, .advertisement, .ad, .sidebar').remove();
      
      // Extract headline
      const headline = $('h1').first().text().trim() || 
                       $('article h1').first().text().trim() ||
                       $('meta[property="og:title"]').attr('content') || '';
      
      // Extract content
      let content = '';
      $('article p, .article-content p, .story-content p, .content p').each((_, el) => {
        content += $(el).text().trim() + '\n';
      });
      
      if (!content) {
        content = $('article').text().trim() || $('main').text().trim();
      }
      
      // Extract published date
      let publishedDate: Date | undefined;
      const dateStr = $('time').attr('datetime') || 
                      $('meta[property="article:published_time"]').attr('content') ||
                      $('[class*="date"]').first().text().trim();
      
      if (dateStr) {
        try {
          publishedDate = new Date(dateStr);
          if (isNaN(publishedDate.getTime())) {
            publishedDate = undefined;
          }
        } catch {
          publishedDate = undefined;
        }
      }
      
      if (!headline || !content || content.length < 100) {
        return null;
      }
      
      return {
        sourceUrl: url,
        sourceName,
        headline,
        content: content.substring(0, 10000), // Limit content length
        publishedDate,
      };
    } catch (error) {
      console.error(`[CourtCaseScraper] Failed to scrape article ${url}:`, error);
      return null;
    }
  }

  /**
   * Check if article is relevant (mentions court case + MP)
   */
  private isRelevantArticle(article: ScrapedArticle): boolean {
    const text = (article.headline + ' ' + article.content).toLowerCase();
    
    // Must mention court-related terms (both criminal and civil)
    const courtTerms = [
      'court', 'trial', 'charged', 'corruption', 'macc', 'sprm', 'prosecution', 
      'acquit', 'convict', 'verdict', 'sentence',
      'defamation', 'libel', 'lawsuit', 'civil suit', 'civil case',
      'sexual assault', 'harassment', 'suing', 'sued', 'damages'
    ];
    const hasCourtTerm = courtTerms.some(term => text.includes(term));
    
    if (!hasCourtTerm) return false;
    
    // Must mention an MP or MP-related terms
    const mpTerms = ['mp', 'member of parliament', 'ahli parlimen', 'wakil rakyat', 'minister', 'menteri', 'prime minister', 'perdana menteri'];
    const hasMpTerm = mpTerms.some(term => text.includes(term));
    
    // Or must mention a known MP name
    const mentionsKnownMp = mpNamesList.some(name => 
      text.includes(name.toLowerCase())
    );
    
    return hasMpTerm || mentionsKnownMp;
  }

  /**
   * Use Gemini AI to extract structured court case data from article
   */
  async extractCourtCaseData(article: ScrapedArticle): Promise<ExtractedCourtCaseData | null> {
    if (!process.env.GEMINI_API_KEY) {
      console.warn("[CourtCaseScraper] GEMINI_API_KEY not configured, skipping AI extraction");
      return null;
    }
    
    try {
      const mpNamesContext = mpNamesList.slice(0, 50).join(', ');
      
      const systemPrompt = `You are an expert at extracting court case information from Malaysian news articles.
Extract relevant court case details for Members of Parliament (MPs).

Known Malaysian MPs include: ${mpNamesContext}

Extract and return JSON with these fields:
- mpName: The name of the MP involved (must match a known MP if possible)
- caseNumber: The court case number if mentioned (e.g., "PP-45-272-11/2018")
- title: A short descriptive title for the case
- courtLevel: The court level (e.g., "High Court", "Sessions Court", "Court of Appeal", "Federal Court")
- status: The case status ("Ongoing", "Completed", "Acquitted", "Convicted", "Appeal Pending")
- caseType: The type of case - "criminal" for corruption/criminal charges, or "civil" for defamation suits, libel suits, civil lawsuits, sexual harassment civil suits, etc.
- charges: Summary of the charges or claims
- outcome: The outcome if case is completed
- filingDate: The date the case was filed (if mentioned), in ISO format

If information is not clearly stated, leave that field empty.`;

      const prompt = `Extract court case information from this news article:

Headline: ${article.headline}

Content:
${article.content.substring(0, 8000)}`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: "application/json",
          responseSchema: {
            type: "object",
            properties: {
              mpName: { type: "string" },
              caseNumber: { type: "string" },
              title: { type: "string" },
              courtLevel: { type: "string" },
              status: { type: "string" },
              caseType: { type: "string" },
              charges: { type: "string" },
              outcome: { type: "string" },
              filingDate: { type: "string" },
            },
          },
        },
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
      });

      const rawJson = response.text;
      if (!rawJson) {
        return null;
      }

      const data = JSON.parse(rawJson) as ExtractedCourtCaseData;
      
      // Try to match MP name to get ID
      if (data.mpName) {
        const mpInfo = mpNamesMap.get(data.mpName.toLowerCase());
        if (mpInfo) {
          data.mpId = mpInfo.id;
        }
      }
      
      return data;
    } catch (error) {
      console.error("[CourtCaseScraper] Failed to extract court case data:", error);
      return null;
    }
  }

  /**
   * Save scraped article to database
   */
  async saveArticle(article: ScrapedArticle, extractedData: ExtractedCourtCaseData | null): Promise<void> {
    try {
      const db = getDb();
      const insertData: InsertCourtCaseNewsArticle = {
        sourceUrl: article.sourceUrl,
        sourceName: article.sourceName,
        headline: article.headline,
        content: article.content,
        publishedDate: article.publishedDate || null,
        extractedData: extractedData || null,
        status: extractedData?.mpId ? "needs_review" : "pending",
      };
      
      await db.insert(courtCaseNewsArticles).values(insertData);
      console.log(`[CourtCaseScraper] Saved article: ${article.headline.substring(0, 50)}...`);
    } catch (error: any) {
      if (error.code === '23505') {
        // Duplicate entry, ignore
        console.log(`[CourtCaseScraper] Article already exists: ${article.sourceUrl}`);
      } else {
        console.error("[CourtCaseScraper] Failed to save article:", error);
      }
    }
  }

  /**
   * Manual search with custom keywords across all news sources
   */
  async manualSearch(searchText: string): Promise<{ articlesScraped: number; articlesWithData: number; articles: ScrapedArticle[] }> {
    console.log(`[CourtCaseScraper] Starting manual search for: "${searchText}"`);
    
    await this.initialize();
    
    let articlesScraped = 0;
    let articlesWithData = 0;
    const allArticles: ScrapedArticle[] = [];
    
    for (const source of NEWS_SOURCES) {
      try {
        console.log(`[CourtCaseScraper] Manual search on ${source.name} for: "${searchText}"`);
        
        await this.delay(1000);
        
        const searchUrl = `${source.searchUrl}${encodeURIComponent(searchText)}`;
        
        try {
          const response = await axios.get(searchUrl, {
            headers: this.headers,
            timeout: 30000,
          });
          
          const $ = cheerio.load(response.data);
          const articleLinks = this.extractArticleLinks($, source.name);
          
          console.log(`[CourtCaseScraper] Found ${articleLinks.length} links on ${source.name}`);
          
          for (const link of articleLinks.slice(0, 5)) {
            try {
              const articleUrl = link.startsWith('http') ? link : `${source.baseUrl}${link}`;
              
              const db = getDb();
              const existing = await db.select()
                .from(courtCaseNewsArticles)
                .where(eq(courtCaseNewsArticles.sourceUrl, articleUrl))
                .limit(1);
              
              if (existing.length > 0) {
                console.log(`[CourtCaseScraper] Already scraped: ${articleUrl}`);
                continue;
              }
              
              await this.delay(500);
              const article = await this.scrapeArticle(articleUrl, source.name);
              
              if (article && article.content.length > 100) {
                const extractedData = await this.extractCourtCaseData(article);
                await this.saveArticle(article, extractedData);
                articlesScraped++;
                allArticles.push(article);
                if (extractedData?.mpName) {
                  articlesWithData++;
                }
              }
            } catch (err) {
              console.error(`[CourtCaseScraper] Failed to scrape article: ${link}`, err);
            }
          }
        } catch (error) {
          console.error(`[CourtCaseScraper] Failed to search ${source.name}:`, error);
        }
      } catch (error) {
        console.error(`[CourtCaseScraper] Error on ${source.name}:`, error);
      }
    }
    
    console.log(`[CourtCaseScraper] Manual search completed. Scraped: ${articlesScraped}, With data: ${articlesWithData}`);
    return { articlesScraped, articlesWithData, articles: allArticles };
  }

  /**
   * Run the full scraping process
   */
  async runScrape(): Promise<{ articlesScraped: number; articlesWithData: number }> {
    console.log("[CourtCaseScraper] Starting court case news scrape...");
    
    await this.initialize();
    
    let articlesScraped = 0;
    let articlesWithData = 0;
    
    for (const source of NEWS_SOURCES) {
      try {
        console.log(`[CourtCaseScraper] Scraping ${source.name}...`);
        const articles = await this.scrapeNewsSource(source);
        
        for (const article of articles) {
          const extractedData = await this.extractCourtCaseData(article);
          await this.saveArticle(article, extractedData);
          articlesScraped++;
          if (extractedData?.mpName) {
            articlesWithData++;
          }
        }
      } catch (error) {
        console.error(`[CourtCaseScraper] Error scraping ${source.name}:`, error);
      }
    }
    
    console.log(`[CourtCaseScraper] Completed. Scraped: ${articlesScraped}, With data: ${articlesWithData}`);
    return { articlesScraped, articlesWithData };
  }

  /**
   * Get pending articles for review
   */
  async getPendingArticles(limit = 20): Promise<any[]> {
    const db = getDb();
    return db.select()
      .from(courtCaseNewsArticles)
      .where(or(
        eq(courtCaseNewsArticles.status, "pending"),
        eq(courtCaseNewsArticles.status, "needs_review")
      ))
      .orderBy(desc(courtCaseNewsArticles.scrapedAt))
      .limit(limit);
  }

  /**
   * Approve an article and create/update court case
   */
  async approveArticle(
    articleId: string, 
    courtCaseData: {
      mpId: string;
      caseNumber: string;
      title: string;
      courtLevel: string;
      status: string;
      charges: string;
      filingDate: Date;
      outcome?: string;
      documentLinks?: string[];
    },
    reviewedBy: string
  ): Promise<{ success: boolean; courtCaseId?: string; error?: string }> {
    try {
      const db = getDb();
      // Check if case already exists
      const existingCase = await db.select()
        .from(courtCases)
        .where(eq(courtCases.caseNumber, courtCaseData.caseNumber))
        .limit(1);
      
      let courtCaseId: string;
      
      if (existingCase.length > 0) {
        // Update existing case
        await db.update(courtCases)
          .set({
            status: courtCaseData.status,
            outcome: courtCaseData.outcome || null,
            documentLinks: courtCaseData.documentLinks || [],
          })
          .where(eq(courtCases.id, existingCase[0].id));
        courtCaseId = existingCase[0].id;
      } else {
        // Create new case
        const [newCase] = await db.insert(courtCases)
          .values({
            mpId: courtCaseData.mpId,
            caseNumber: courtCaseData.caseNumber,
            title: courtCaseData.title,
            courtLevel: courtCaseData.courtLevel,
            status: courtCaseData.status,
            charges: courtCaseData.charges,
            filingDate: courtCaseData.filingDate,
            outcome: courtCaseData.outcome || null,
            documentLinks: courtCaseData.documentLinks || [],
          })
          .returning();
        courtCaseId = newCase.id;
      }
      
      // Update article status
      await db.update(courtCaseNewsArticles)
        .set({
          status: "approved",
          reviewedBy,
          reviewedAt: new Date(),
          linkedCourtCaseId: courtCaseId,
        })
        .where(eq(courtCaseNewsArticles.id, articleId));
      
      return { success: true, courtCaseId };
    } catch (error: any) {
      console.error("[CourtCaseScraper] Failed to approve article:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Reject an article
   */
  async rejectArticle(articleId: string, reviewedBy: string): Promise<void> {
    const db = getDb();
    await db.update(courtCaseNewsArticles)
      .set({
        status: "rejected",
        reviewedBy,
        reviewedAt: new Date(),
      })
      .where(eq(courtCaseNewsArticles.id, articleId));
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Singleton instance
export const courtCaseScraper = new CourtCaseScraper();
