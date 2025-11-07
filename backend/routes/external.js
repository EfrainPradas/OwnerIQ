/**
 * External API Routes
 * Handles integrations with third-party APIs (Zillow, RapidAPI, etc.)
 */

const express = require('express');
const router = express.Router();
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

/**
 * GET /api/external/property-details
 * Fetch property details from Zillow via RapidAPI
 */
router.get('/property-details', async (req, res) => {
  try {
    const { address } = req.query;

    if (!address) {
      return res.status(400).json({
        error: 'Address parameter is required',
        details: 'Please provide an address to search for property details'
      });
    }

    // Check if RapidAPI key is configured
    const rapidApiKey = process.env.RAPIDAPI_KEY;
    if (!rapidApiKey) {
      console.error('RAPIDAPI_KEY not configured in environment variables');
      return res.status(500).json({
        error: 'External API not configured',
        details: 'The property lookup service is not configured. Please contact support.'
      });
    }

    console.log(`🔍 Fetching property details for address: ${address}`);

    // Call Zillow API via RapidAPI
    const apiUrl = `https://zillow56.p.rapidapi.com/search?location=${encodeURIComponent(address)}`;

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'X-RapidAPI-Key': rapidApiKey,
        'X-RapidAPI-Host': 'zillow56.p.rapidapi.com'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`RapidAPI error (${response.status}):`, errorText);

      if (response.status === 429) {
        return res.status(429).json({
          error: 'Rate limit exceeded',
          details: 'Too many requests to the property lookup service. Please try again later.'
        });
      }

      if (response.status === 403) {
        return res.status(403).json({
          error: 'API access denied',
          details: 'Invalid API credentials. Please contact support.'
        });
      }

      return res.status(response.status).json({
        error: 'Failed to fetch property details',
        details: `External API returned status ${response.status}`
      });
    }

    const data = await response.json();

    // Check if data was returned
    if (!data || !data.results || data.results.length === 0) {
      console.log('No property found for address:', address);
      return res.status(404).json({
        error: 'Property not found',
        details: 'No property information found for the provided address. Please verify the address is correct and try again.'
      });
    }

    // Get the first result (most relevant)
    const property = data.results[0];

    console.log(`✅ Property found: ${property.streetAddress || 'N/A'}`);

    // Return formatted property data
    res.json({
      success: true,
      data: {
        // Address information
        streetAddress: property.streetAddress,
        city: property.city,
        state: property.state,
        zipcode: property.zipcode,
        county: property.county,

        // Property details
        price: property.price,
        bedrooms: property.bedrooms,
        bathrooms: property.bathrooms,
        yearBuilt: property.yearBuilt,
        livingArea: property.livingArea,
        lotAreaValue: property.lotAreaValue,
        lotAreaUnits: property.lotAreaUnits || 'sqft',
        homeType: property.homeType,
        homeStatus: property.homeStatus,

        // Financial information
        zestimate: property.zestimate,
        rentZestimate: property.rentZestimate,
        propertyTaxRate: property.propertyTaxRate,
        annualHomeownersInsurance: property.annualHomeownersInsurance,

        // Images
        hiResImageLink: property.hiResImageLink,
        mediumImageLink: property.mediumImageLink,

        // Additional data
        zpid: property.zpid,
        nearbyCities: property.nearbyCities || [],
        nearbyZipcodes: property.nearbyZipcodes || [],

        // Full raw data (for debugging)
        _raw: property
      }
    });

  } catch (error) {
    console.error('Error in /api/external/property-details:', error);
    res.status(500).json({
      error: 'Internal server error',
      details: error.message || 'An unexpected error occurred while fetching property details'
    });
  }
});

/**
 * GET /api/external/property/:zpid
 * Fetch detailed property information by Zillow Property ID (ZPID)
 */
router.get('/property/:zpid', async (req, res) => {
  try {
    const { zpid } = req.params;

    if (!zpid) {
      return res.status(400).json({
        error: 'ZPID parameter is required',
        details: 'Please provide a Zillow Property ID (ZPID)'
      });
    }

    const rapidApiKey = process.env.RAPIDAPI_KEY;
    if (!rapidApiKey) {
      console.error('RAPIDAPI_KEY not configured in environment variables');
      return res.status(500).json({
        error: 'External API not configured',
        details: 'The property lookup service is not configured. Please contact support.'
      });
    }

    console.log(`🔍 Fetching property details for ZPID: ${zpid}`);

    const apiUrl = `https://zillow56.p.rapidapi.com/property?zpid=${zpid}`;

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'X-RapidAPI-Key': rapidApiKey,
        'X-RapidAPI-Host': 'zillow56.p.rapidapi.com'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`RapidAPI error (${response.status}):`, errorText);
      return res.status(response.status).json({
        error: 'Failed to fetch property details',
        details: `External API returned status ${response.status}`
      });
    }

    const data = await response.json();

    console.log(`✅ Property details retrieved for ZPID: ${zpid}`);

    res.json({
      success: true,
      data
    });

  } catch (error) {
    console.error('Error in /api/external/property/:zpid:', error);
    res.status(500).json({
      error: 'Internal server error',
      details: error.message || 'An unexpected error occurred while fetching property details'
    });
  }
});

module.exports = router;
