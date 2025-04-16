import { ClickEvent } from "../models/ClickEvent";
import geoip from "geoip-lite"; // npm i geoip-lite
import { Link } from "../models/Link";
import { AppError } from "../middleware/errorHandler";
import express, { NextFunction, Request, Response } from "express";
import { UAParser } from "ua-parser-js"; // npm i ua-parser-js

const router = express.Router();

// First, let's enhance the redirect tracking function since it's duplicated in both routes
const trackClickEvent = async (req: Request, link: any) => {
  try {
    // Get IP address with more robust handling
    const ip = 
      req.headers["x-forwarded-for"]?.toString().split(",")[0].trim() ||
      req.headers["x-real-ip"]?.toString() ||
      req.socket.remoteAddress ||
      "Unknown";
      
    // Handle geo information with better fallbacks
    let geo = { country: "Unknown", city: "Unknown", region: "Unknown" };
    if (ip && ip !== "::1" && !ip.startsWith("127.0.0.1")) {
      const geoLookup = geoip.lookup(ip);
      if (geoLookup) {
        geo = {
          country: geoLookup.country || "Unknown",
          city: geoLookup.city || "Unknown",
          region: geoLookup.region || "Unknown"
        };
      }
    } else {
      // Local development placeholder
      geo = { country: "Local", city: "Development", region: "Local" };
    }

    const userAgent = req.headers["user-agent"] || "";
    const parser = new UAParser(userAgent);
    const result = parser.getResult();

    // Get more detailed device information
    let deviceInfo = "Unknown";
    if (result.device.type) {
      deviceInfo = result.device.type;
      if (result.device.vendor) deviceInfo = `${result.device.vendor} ${deviceInfo}`;
      if (result.device.model) deviceInfo = `${deviceInfo} ${result.device.model}`;
    } else if (result.os.name) {
      deviceInfo = `Desktop (${result.os.name})`;
    }

    // Get more detailed browser info
    const browserInfo = result.browser.name 
      ? `${result.browser.name} ${result.browser.version || ''}`
      : "Unknown";

    // Get full OS details
    const osInfo = result.os.name 
      ? `${result.os.name} ${result.os.version || ''}`
      : "Unknown";

    // Get all UTM parameters, not just the 3 standard ones
    const utmParams: any = {};
    Object.keys(req.query).forEach(key => {
      if (key.startsWith('utm_') && typeof req.query[key] === 'string') {
        // Remove 'utm_' prefix and store value
        const utmKey = key.substring(4);
        utmParams[utmKey] = req.query[key] as string;
      }
    });

    // Create enhanced click event
    return await ClickEvent.create({
      linkId: link._id,
      ip,
      timestamp: new Date(),
      country: geo.country,
      city: geo.city,
      region: geo.region,
      device: deviceInfo,
      deviceType: result.device.type || "desktop",
      deviceVendor: result.device.vendor || "Unknown",
      deviceModel: result.device.model || "Unknown",
      browser: browserInfo,
      browserName: result.browser.name || "Unknown",
      browserVersion: result.browser.version || "Unknown",
      os: osInfo,
      osName: result.os.name || "Unknown",
      osVersion: result.os.version || "Unknown",
      referrer: req.get("Referer") || "Direct",
      utmSource: utmParams.source,
      utmMedium: utmParams.medium,
      utmCampaign: utmParams.campaign,
      utmTerm: utmParams.term,
      utmContent: utmParams.content,
      // Store all other UTM parameters
      utmParams,
      // Additional useful information
      queryParams: req.query,
      language: req.headers["accept-language"] || "Unknown",
      screenSize: req.headers["viewport-width"] ? 
        `${req.headers["viewport-width"]}x${req.headers["viewport-height"]}` : 
        "Unknown"
    });
  } catch (error) {
    console.error("Error tracking click event:", error);
    // Just log the error but don't block the redirect
    return null;
  }
};

// Redirect route (public)
router.get(
  "/:domain/:slug",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { domain, slug } = req.params;

      const link = await Link.findOne({ domain, slug });

      if (!link) {
        return next(new AppError("Link not found", 404));
      }

      // Check if link is expired
      if (link.expiresAt && link.expiresAt < new Date()) {
        return next(new AppError("Link has expired", 410));
      }

      // Check if password protected
      if (link.passwordProtected) {
        const password = req.query.password as string;
        if (!password || password !== link.password) {
          return res.status(401).json({
            status: "error",
            message: "Password required",
          });
        }
      }

      // Track analytics asynchronously (don't wait for it to complete)
      trackClickEvent(req, link).catch(err => console.error("Tracking error:", err));

      // Redirect immediately
      res.redirect(link.destinationUrl);
    } catch (error) {
      next(error);
    }
  }
);

// if domain is not provided, redirect to the default domain
router.get("/:slug", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { slug } = req.params;
    const link = await Link.findOne({ slug });
    
    if (!link) {
      return next(new AppError("Link not found", 404));
    }
    
    if (link.expiresAt && link.expiresAt < new Date()) {
      return next(new AppError("Link has expired", 410));
    }
    
    if (link.passwordProtected) {
      const password = req.query.password as string;
      if (!password || password !== link.password) {
        return res.status(401).json({
          status: "error",
          message: "Password required",
        });
      }
    }
    
    // Track analytics asynchronously
    trackClickEvent(req, link).catch(err => console.error("Tracking error:", err));
    
    // Redirect immediately
    res.redirect(link.destinationUrl);
  } catch (error) {
    next(error);
  }
});
export const redirectRoutes = router;
