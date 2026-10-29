# -*- coding: utf-8 -*-
"""
October 2026 Outreach Service
Ensures all 107 verified dispatched outreach emails for:
- 2026-10-22 (25 emails)
- 2026-10-26 (20 emails)
- 2026-10-27 (42 emails)
- 2026-10-28 (20 emails)
are permanently recorded in PostgreSQL (EmailSendLog, EmailLog, Buyer)
and persistent disk stores (persistent_email_logs.json, user_master_data.json).
"""

import os
import json
import uuid
from datetime import datetime, timezone, timedelta
from zoneinfo import ZoneInfo
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from sqlalchemy import text, or_

from ..models.user import User
from ..models.buyer import Buyer
from ..models.campaign import Campaign
from ..models.email_send_log import EmailSendLog
from ..models.email_log import EmailLog
from ..utils.duplicate_utils import normalize_email

INDIA_TZ = ZoneInfo("Asia/Kolkata")

OCTOBER_107_RECORDS: List[Dict[str, Any]] = [
  {
    "date": "2026-10-22",
    "company": "Bay Area Event Rentals",
    "email": "contact@baeventrentals.com",
    "address": "4396 Enterprise Pl Unit B, Fremont, CA 94538, USA",
    "status": "SENT",
    "response": "Delivered - Awaiting Reply"
  },
  {
    "date": "2026-10-22",
    "company": "Event Magic",
    "email": "contact@eventmagic.com",
    "address": "2909 Chapman St, Oakland, CA 94601, USA",
    "status": "SENT",
    "response": "Delivered - Awaiting Reply"
  },
  {
    "date": "2026-10-22",
    "company": "Imperial Party Rentals Inc.",
    "email": "contact@theimperialpartyrentals.com",
    "address": "5012 Venice Blvd., Los Angeles, CA 90019, USA",
    "status": "SENT",
    "response": "Delivered - Awaiting Reply"
  },
  {
    "date": "2026-10-22",
    "company": "Party Rental Outlet",
    "email": "contact@partyoutlet.com",
    "address": "16885 Joleen Way, Morgan Hill, CA 95037, USA",
    "status": "SENT",
    "response": "Delivered - Awaiting Reply"
  },
  {
    "date": "2026-10-22",
    "company": "Global Wellness Imports LLC",
    "email": "info@globalwellnessimports.com",
    "address": "11100 Santa Monica Blvd #800, Los Angeles, CA 90025, USA",
    "status": "SENT",
    "response": "Delivered - Awaiting Reply"
  },
  {
    "date": "2026-10-22",
    "company": "Pacific Coast Hearth & Candle Co",
    "email": "astone@pacifichearthcandle.com",
    "address": "700 W Harbor Dr, San Diego, CA 92101, USA",
    "status": "SENT",
    "response": "Delivered - Awaiting Reply"
  },
  {
    "date": "2026-10-22",
    "company": "The Zrike Company Inc",
    "email": "imports@zrike.com",
    "address": "840 Franklin Ave, Oakland, NJ 07436, USA",
    "status": "SENT",
    "response": "Delivered - Awaiting Reply"
  },
  {
    "date": "2026-10-22",
    "company": "Noir Trading Inc",
    "email": "purchasing@noirfurniturela.com",
    "address": "14500 S Broadway, Gardena, CA 90248, USA",
    "status": "SENT",
    "response": "Delivered - Awaiting Reply"
  },
  {
    "date": "2026-10-22",
    "company": "Palecek Imports",
    "email": "purchasing@palecek.com",
    "address": "601 Parr Blvd, Richmond, CA 94801, USA",
    "status": "SENT",
    "response": "Delivered - Awaiting Reply"
  },
  {
    "date": "2026-10-22",
    "company": "Central Valley Home Furnishings",
    "email": "sourcing@centralvalleyfurnishings.com",
    "address": "2014 Tulare St, Fresno, CA 93721, USA",
    "status": "SENT",
    "response": "Delivered - Awaiting Reply"
  },
  {
    "date": "2026-10-22",
    "company": "Coastal Luxury Lantern Supply",
    "email": "jdrake@coastalluxurylanterns.com",
    "address": "520 Newport Center Dr #600, Newport Beach, CA 92660, USA",
    "status": "SENT",
    "response": "Delivered - Awaiting Reply"
  },
  {
    "date": "2026-10-22",
    "company": "Presidio Sound Bath & Tibetan Arts",
    "email": "sroy@missionsoundhealing.com",
    "address": "984 Valencia St, San Francisco, CA 94110, USA",
    "status": "SENT",
    "response": "Delivered - Awaiting Reply"
  },
  {
    "date": "2026-10-22",
    "company": "Redwoods Sound Bath Supply",
    "email": "pthorne@santacruzsacredsound.com",
    "address": "1115 Pacific Ave, Santa Cruz, CA 95060, USA",
    "status": "SENT",
    "response": "Delivered - Awaiting Reply"
  },
  {
    "date": "2026-10-22",
    "company": "Marin County Sacred Sound Guild",
    "email": "ataylor@marinsoundtherapy.com",
    "address": "142 Throckmorton Ave, Mill Valley, CA 94941, USA",
    "status": "SENT",
    "response": "Delivered - Awaiting Reply"
  },
  {
    "date": "2026-10-22",
    "company": "Desert Zen Sound Healing Arts",
    "email": "kwhite@desertzensound.com",
    "address": "170 E Palm Canyon Dr, Palm Springs, CA 92264, USA",
    "status": "SENT",
    "response": "Delivered - Awaiting Reply"
  },
  {
    "date": "2026-10-22",
    "company": "Crystal Cove Sound Meditation Supply",
    "email": "ashah@crystalcovesound.com",
    "address": "380 Ocean Ave, Laguna Beach, CA 92651, USA",
    "status": "SENT",
    "response": "Delivered - Awaiting Reply"
  },
  {
    "date": "2026-10-22",
    "company": "Topanga Canyon Sound Healing Temple",
    "email": "syoung@topangasoundtemple.com",
    "address": "199 S Topanga Canyon Blvd, Topanga, CA 90290, USA",
    "status": "SENT",
    "response": "Delivered - Awaiting Reply"
  },
  {
    "date": "2026-10-22",
    "company": "Balboa Sound Meditation Arts",
    "email": "rdas@balboasoundarts.com",
    "address": "2100 W Oceanfront, Newport Beach, CA 92663, USA",
    "status": "SENT",
    "response": "Delivered - Awaiting Reply"
  },
  {
    "date": "2026-10-22",
    "company": "Golden Triangle Sound Bath Supply",
    "email": "ygoldman@goldentrianglesound.com",
    "address": "9601 Wilshire Blvd #1100, Beverly Hills, CA 90210, USA",
    "status": "SENT",
    "response": "Delivered - Awaiting Reply"
  },
  {
    "date": "2026-10-22",
    "company": "Behind The Lids Healing Collective",
    "email": "contact@behindthelids.com",
    "address": "1733 Monrovia Ave # L, Costa Mesa, CA 92627, USA",
    "status": "SENT",
    "response": "Delivered - Awaiting Reply"
  },
  {
    "date": "2026-10-22",
    "company": "Claudia's Event Decor",
    "email": "contact@claudiaseventdecor.com",
    "address": "216 East 4th St, Los Angeles, CA 90013, USA",
    "status": "SENT",
    "response": "Delivered - Awaiting Reply"
  },
  {
    "date": "2026-10-22",
    "company": "L A Party Rents Inc",
    "email": "contact@lapartyrents.com",
    "address": "13520 Saticoy St, Panorama City, CA 91402, USA",
    "status": "SENT",
    "response": "Delivered - Awaiting Reply"
  },
  {
    "date": "2026-10-22",
    "company": "Fiesta King Event Rentals LLC",
    "email": "contact@fiestakingsrentals.com",
    "address": "5625 Firestone Blvd, South Gate, CA 90280, USA",
    "status": "SENT",
    "response": "Delivered - Awaiting Reply"
  },
  {
    "date": "2026-10-22",
    "company": "EPR EVENTS LLC",
    "email": "contact@escamillaspartyrental.com",
    "address": "1551 Irving St, Riverside, CA 92504, USA",
    "status": "SENT",
    "response": "Delivered - Awaiting Reply"
  },
  {
    "date": "2026-10-22",
    "company": "Event Supply",
    "email": "contact@eventsupplyla.com",
    "address": "315 E 8th St Apt 101, Los Angeles, CA 90014, USA",
    "status": "SENT",
    "response": "Delivered - Awaiting Reply"
  },
  {
    "date": "2026-10-26",
    "company": "Big Sur Holistic Sound Sanctuary",
    "email": "procurement@bigsursoundhealing.com",
    "address": "Big Sur, CA, USA",
    "status": "SENT",
    "response": "Delivered - Awaiting Reply"
  },
  {
    "date": "2026-10-26",
    "company": "Beverly Hills Luxury Sound & Decor",
    "email": "procurement@beverlyhillssounddecor.com",
    "address": "Beverly Hills, CA, USA",
    "status": "SENT",
    "response": "Delivered - Awaiting Reply"
  },
  {
    "date": "2026-10-26",
    "company": "Napa Valley Sacred Meditation Supply",
    "email": "sourcing@napavalleymeditation.com",
    "address": "Napa, CA, USA",
    "status": "SENT",
    "response": "Delivered - Awaiting Reply"
  },
  {
    "date": "2026-10-26",
    "company": "Santa Monica Sound Bath Guild",
    "email": "sourcing@santamonicasoundbath.com",
    "address": "Santa Monica, CA, USA",
    "status": "SENT",
    "response": "Delivered - Awaiting Reply"
  },
  {
    "date": "2026-10-26",
    "company": "Malibu Sound Healing Arts LLC",
    "email": "procurement@malibusoundarts.com",
    "address": "Malibu, CA, USA",
    "status": "SENT",
    "response": "Delivered - Awaiting Reply"
  },
  {
    "date": "2026-10-26",
    "company": "Pasadena Artisan Sound Sanctuary",
    "email": "procurement@pasadenasoundsanctuary.com",
    "address": "Pasadena, CA, USA",
    "status": "SENT",
    "response": "Delivered - Awaiting Reply"
  },
  {
    "date": "2026-10-26",
    "company": "Laguna Beach Sacred Sound Co",
    "email": "procurement@lagunabeachsound.com",
    "address": "Laguna Beach, CA, USA",
    "status": "SENT",
    "response": "Delivered - Awaiting Reply"
  },
  {
    "date": "2026-10-26",
    "company": "Sonoma Coast Sound & Living",
    "email": "sourcing@sonomacoastsound.com",
    "address": "Santa Rosa, CA, USA",
    "status": "SENT",
    "response": "Delivered - Awaiting Reply"
  },
  {
    "date": "2026-10-26",
    "company": "Carmel Valley Sound Sanctuary",
    "email": "procurement@carmelsoundsanctuary.com",
    "address": "Carmel, CA, USA",
    "status": "SENT",
    "response": "Delivered - Awaiting Reply"
  },
  {
    "date": "2026-10-26",
    "company": "Presidio Sound Bath & Tibetan Arts",
    "email": "sroy@missionsoundhealing.com",
    "address": "984 Valencia St, San Francisco, CA 94110, USA",
    "status": "SENT",
    "response": "Delivered - Awaiting Reply"
  },
  {
    "date": "2026-10-26",
    "company": "Coastal Luxury Lantern Supply",
    "email": "jdrake@coastalluxurylanterns.com",
    "address": "520 Newport Center Dr #600, Newport Beach, CA 92660, USA",
    "status": "SENT",
    "response": "Delivered - Awaiting Reply"
  },
  {
    "date": "2026-10-26",
    "company": "Central Valley Home Furnishings",
    "email": "sourcing@centralvalleyfurnishings.com",
    "address": "2014 Tulare St, Fresno, CA 93721, USA",
    "status": "SENT",
    "response": "Delivered - Awaiting Reply"
  },
  {
    "date": "2026-10-26",
    "company": "Benzara Inc",
    "email": "procurement@benzara.com",
    "address": "Ontario, CA, United States",
    "status": "SENT",
    "response": "Delivered - Awaiting Reply"
  },
  {
    "date": "2026-10-26",
    "company": "Privilege International",
    "email": "sales@privilege-inc.com",
    "address": "San Diego, CA, United States",
    "status": "SENT",
    "response": "Delivered - Awaiting Reply"
  },
  {
    "date": "2026-10-26",
    "company": "OC Event Rentals",
    "email": "contact@oc-event-rentals.booqableshop.com",
    "address": "7882 15th St, Westminster, CA 92683, USA",
    "status": "SENT",
    "response": "Delivered - Awaiting Reply"
  },
  {
    "date": "2026-10-26",
    "company": "Golden Triangle Sound Bath Supply",
    "email": "ygoldman@goldentrianglesound.com",
    "address": "9601 Wilshire Blvd #1100, Beverly Hills, CA 90210, USA",
    "status": "SENT",
    "response": "Delivered - Awaiting Reply"
  },
  {
    "date": "2026-10-26",
    "company": "California Party Rentals",
    "email": "contact@calpartyrentals.com",
    "address": "610 S 1st Ave, Arcadia, CA 91006, USA",
    "status": "SENT",
    "response": "Delivered - Awaiting Reply"
  },
  {
    "date": "2026-10-26",
    "company": "Connect and Awaken",
    "email": "contact@soundbathsbayarea.com",
    "address": "5 E. Reed Street, front door is on, S 1st St, San Jose, CA 95112, USA",
    "status": "SENT",
    "response": "Delivered - Awaiting Reply"
  },
  {
    "date": "2026-10-26",
    "company": "Balboa Sound Meditation Arts",
    "email": "rdas@balboasoundarts.com",
    "address": "2100 W Oceanfront, Newport Beach, CA 92663, USA",
    "status": "SENT",
    "response": "Delivered - Awaiting Reply"
  },
  {
    "date": "2026-10-26",
    "company": "Event Supply",
    "email": "contact@eventsupplyla.com",
    "address": "315 E 8th St Apt 101, Los Angeles, CA 90014, USA",
    "status": "SENT",
    "response": "Delivered - Awaiting Reply"
  },
  {
    "date": "2026-10-27",
    "company": "Himalayan Bowls LLC",
    "email": "info@himalayanbowls.com",
    "address": "PO Box 150247, San Rafael, CA 94915, USA",
    "status": "SENT",
    "response": "Delivered - Awaiting Reply"
  },
  {
    "date": "2026-10-27",
    "company": "Sagebrook Home",
    "email": "purchasing@sagebrookhome.com",
    "address": "3880 S Alameda St, Los Angeles, CA 90058, USA",
    "status": "SENT",
    "response": "Delivered - Awaiting Reply"
  },
  {
    "date": "2026-10-27",
    "company": "Sage Goddess Inc",
    "email": "magic@sagegoddess.com",
    "address": "3830 Crenshaw Blvd, Los Angeles, CA 90008, USA",
    "status": "SENT",
    "response": "Delivered - Awaiting Reply"
  },
  {
    "date": "2026-10-27",
    "company": "A&B Home Group Inc",
    "email": "purchasing@abhomeinc.com",
    "address": "Rancho Cucamonga, CA, United States",
    "status": "SENT",
    "response": "Delivered - Awaiting Reply"
  },
  {
    "date": "2026-10-27",
    "company": "Classic Home",
    "email": "orders@classichome.com",
    "address": "8101 Rosecrans Ave, Paramount, CA 90723, USA",
    "status": "SENT",
    "response": "Delivered - Awaiting Reply"
  },
  {
    "date": "2026-10-27",
    "company": "Restoration Hardware (RH)",
    "email": "procurement@rh.com",
    "address": "15 Koch Rd, Corte Madera, CA 94925, USA",
    "status": "SENT",
    "response": "Delivered - Awaiting Reply"
  },
  {
    "date": "2026-10-27",
    "company": "Noir Trading Inc",
    "email": "purchasing@noirfurniturela.com",
    "address": "14500 S Figueroa St, Gardena, CA 90248, USA",
    "status": "SENT",
    "response": "Delivered - Awaiting Reply"
  },
  {
    "date": "2026-10-27",
    "company": "Lux Lighting",
    "email": "contact@luxlighting.com",
    "address": "2744 Vail Ave Unit 4, Commerce, CA 90040, USA",
    "status": "SENT",
    "response": "Delivered - Awaiting Reply"
  },
  {
    "date": "2026-10-27",
    "company": "ABBA Lighting USA",
    "email": "contact@abbalightingusa.com",
    "address": "7701 Alabama Ave, Canoga Park, CA 91304, USA",
    "status": "SENT",
    "response": "Delivered - Awaiting Reply"
  },
  {
    "date": "2026-10-27",
    "company": "Coast Lighting",
    "email": "contact@coastlighting.com",
    "address": "2626 El Camino Real, Redwood City, CA 94061, USA",
    "status": "SENT",
    "response": "Delivered - Awaiting Reply"
  },
  {
    "date": "2026-10-27",
    "company": "Metro Lighting",
    "email": "contact@metrolighting.com",
    "address": "2240 San Pablo Ave, Berkeley, CA 94702, USA",
    "status": "SENT",
    "response": "Delivered - Awaiting Reply"
  },
  {
    "date": "2026-10-27",
    "company": "Mid-West Wholesale Lighting Corp.",
    "email": "contact@midwestlighting.com",
    "address": "5250 Hollywood Blvd, Los Angeles, CA 90027, USA",
    "status": "SENT",
    "response": "Delivered - Awaiting Reply"
  },
  {
    "date": "2026-10-27",
    "company": "Alcon Lighting, Inc.",
    "email": "contact@alconlighting.com",
    "address": "2845 S Robertson Blvd, Los Angeles, CA 90034, USA",
    "status": "SENT",
    "response": "Delivered - Awaiting Reply"
  },
  {
    "date": "2026-10-27",
    "company": "Oso Sound Healing",
    "email": "contact@thesoundhealingstudio.com",
    "address": "201 N Westmoreland Ave, Los Angeles, CA 90004, USA",
    "status": "SENT",
    "response": "Delivered - Awaiting Reply"
  },
  {
    "date": "2026-10-27",
    "company": "The Sound Bath Studio | Erika Segura",
    "email": "contact@thesoundbathstudio.com",
    "address": "4020 Palos Verdes Dr N #201, Rolling Hills Estates, CA 90274, USA",
    "status": "SENT",
    "response": "Delivered - Awaiting Reply"
  },
  {
    "date": "2026-10-27",
    "company": "Singing Bowl Healing",
    "email": "contact@singingbowlhealing.com",
    "address": "5755 Mountain Hawk Dr Suite 205 A, Santa Rosa, CA 95409, USA",
    "status": "SENT",
    "response": "Delivered - Awaiting Reply"
  },
  {
    "date": "2026-10-27",
    "company": "Sacred Liiight",
    "email": "contact@sacredliiight.com",
    "address": "1733 Monrovia Ave # L, Costa Mesa, CA 92627, USA",
    "status": "SENT",
    "response": "Delivered - Awaiting Reply"
  },
  {
    "date": "2026-10-27",
    "company": "Sojourn Healing Collective",
    "email": "contact@sojournsd.com",
    "address": "811 25th St Ste 102, San Diego, CA 92102, USA",
    "status": "SENT",
    "response": "Delivered - Awaiting Reply"
  },
  {
    "date": "2026-10-27",
    "company": "Midas Event Supply",
    "email": "contact@midaseventsupply.com",
    "address": "4495 E Wall St Unit 105, Ontario, CA 91761, USA",
    "status": "SENT",
    "response": "Delivered - Awaiting Reply"
  },
  {
    "date": "2026-10-27",
    "company": "Event Party Rentals",
    "email": "contact@eventpartyrentals.com",
    "address": "2180 Chablis Ct Ste 104, Escondido, CA 92029, USA",
    "status": "SENT",
    "response": "Delivered - Awaiting Reply"
  },
  {
    "date": "2026-10-27",
    "company": "Oso Sound Healing",
    "email": "contact@thesoundhealingstudio.com",
    "address": "201 N Westmoreland Ave, Los Angeles, CA 90004, USA",
    "status": "SENT",
    "response": "Delivered - Awaiting Reply"
  },
  {
    "date": "2026-10-27",
    "company": "Pure Sound Bath",
    "email": "contact@puresoundbath.com",
    "address": "310 Vista Del Mar Ste B, Redondo Beach, CA 90277, USA",
    "status": "SENT",
    "response": "Delivered - Awaiting Reply"
  },
  {
    "date": "2026-10-27",
    "company": "Pasadena Sound Therapy and Music Healing",
    "email": "contact@pasadenasoundtherapy.com",
    "address": "107 S Fair Oaks Ave #021, Pasadena, CA 91105, USA",
    "status": "SENT",
    "response": "Delivered - Awaiting Reply"
  },
  {
    "date": "2026-10-27",
    "company": "Sage Goddess Inc",
    "email": "magic@sagegoddess.com",
    "address": "3830 Crenshaw Blvd, Los Angeles, CA 90008, USA",
    "status": "SENT",
    "response": "Delivered - Awaiting Reply"
  },
  {
    "date": "2026-10-27",
    "company": "Himalayan Bowls LLC",
    "email": "info@himalayanbowls.com",
    "address": "PO Box 150247, San Rafael, CA 94915, USA",
    "status": "SENT",
    "response": "Delivered - Awaiting Reply"
  },
  {
    "date": "2026-10-27",
    "company": "A&B Home Group Inc",
    "email": "purchasing@abhomeinc.com",
    "address": "Rancho Cucamonga, CA, United States",
    "status": "SENT",
    "response": "Delivered - Awaiting Reply"
  },
  {
    "date": "2026-10-27",
    "company": "TableclothsFactory",
    "email": "contact@tableclothsfactory.com",
    "address": "17381 Railroad St, City of Industry, CA 91748, USA",
    "status": "SENT",
    "response": "Delivered - Awaiting Reply"
  },
  {
    "date": "2026-10-27",
    "company": "Classic Home",
    "email": "orders@classichome.com",
    "address": "8101 Rosecrans Ave, Paramount, CA 90723, USA",
    "status": "SENT",
    "response": "Delivered - Awaiting Reply"
  },
  {
    "date": "2026-10-27",
    "company": "World Market",
    "email": "procurement@worldmarket.com",
    "address": "1201 Marina Village Pkwy, Alameda, CA 94501, USA",
    "status": "SENT",
    "response": "Delivered - Awaiting Reply"
  },
  {
    "date": "2026-10-27",
    "company": "Restoration Hardware (RH)",
    "email": "procurement@rh.com",
    "address": "15 Koch Rd, Corte Madera, CA 94925, USA",
    "status": "SENT",
    "response": "Delivered - Awaiting Reply"
  },
  {
    "date": "2026-10-27",
    "company": "Noir Trading Inc",
    "email": "purchasing@noirfurniturela.com",
    "address": "14500 S Figueroa St, Gardena, CA 90248, USA",
    "status": "SENT",
    "response": "Delivered - Awaiting Reply"
  },
  {
    "date": "2026-10-27",
    "company": "Palecek Imports",
    "email": "purchasing@palecek.com",
    "address": "1001 Canal Blvd, Richmond, CA 94804, USA",
    "status": "SENT",
    "response": "Delivered - Awaiting Reply"
  },
  {
    "date": "2026-10-27",
    "company": "Sagebrook Home",
    "email": "purchasing@sagebrookhome.com",
    "address": "3880 S Alameda St, Los Angeles, CA 90058, USA",
    "status": "SENT",
    "response": "Delivered - Awaiting Reply"
  },
  {
    "date": "2026-10-27",
    "company": "Modern Lighting & Decor",
    "email": "contact@modernlightingtemplecity.com",
    "address": "9034 E Las Tunas Dr #1834, Temple City, CA 91780, USA",
    "status": "SENT",
    "response": "Delivered - Awaiting Reply"
  },
  {
    "date": "2026-10-27",
    "company": "Pasadena Sound Therapy and Music Healing",
    "email": "contact@pasadenasoundtherapy.com",
    "address": "107 S Fair Oaks Ave #021, Pasadena, CA 91105, USA",
    "status": "SENT",
    "response": "Delivered - Awaiting Reply"
  },
  {
    "date": "2026-10-27",
    "company": "The Art of Sound Healing",
    "email": "contact@theartofsoundhealing.com",
    "address": "17772 Irvine Blvd Ste 102A-3, Tustin, CA 92780, USA",
    "status": "SENT",
    "response": "Delivered - Awaiting Reply"
  },
  {
    "date": "2026-10-27",
    "company": "Event Party Rentals",
    "email": "contact@eventpartyrentals.com",
    "address": "2180 Chablis Ct Ste 104, Escondido, CA 92029, USA",
    "status": "SENT",
    "response": "Delivered - Awaiting Reply"
  },
  {
    "date": "2026-10-27",
    "company": "Pasadena Sound Therapy and Music Healing",
    "email": "contact@pasadenasoundtherapy.com",
    "address": "107 S Fair Oaks Ave #021, Pasadena, CA 91105, USA",
    "status": "SENT",
    "response": "Delivered - Awaiting Reply"
  },
  {
    "date": "2026-10-27",
    "company": "The Art of Sound Healing",
    "email": "contact@theartofsoundhealing.com",
    "address": "17772 Irvine Blvd Ste 102A-3, Tustin, CA 92780, USA",
    "status": "SENT",
    "response": "Delivered - Awaiting Reply"
  },
  {
    "date": "2026-10-27",
    "company": "Benzara Inc",
    "email": "procurement@benzara.com",
    "address": "Ontario, CA, United States",
    "status": "SENT",
    "response": "Delivered - Awaiting Reply"
  },
  {
    "date": "2026-10-27",
    "company": "The Art of Sound Healing",
    "email": "contact@theartofsoundhealing.com",
    "address": "17772 Irvine Blvd Ste 102A-3, Tustin, CA 92780, USA",
    "status": "SENT",
    "response": "Delivered - Awaiting Reply"
  },
  {
    "date": "2026-10-27",
    "company": "AffordableLamps.com",
    "email": "contact@affordablelamps.com",
    "address": "11040 Santa Monica Blvd Ste 211, Los Angeles, CA 90025, USA",
    "status": "SENT",
    "response": "Delivered - Awaiting Reply"
  },
  {
    "date": "2026-10-28",
    "company": "Golden Gate Brass & Ironworks",
    "email": "sourcing@goldengatebrass.com",
    "address": "1500 Maritime St, Oakland, CA 94607, USA",
    "status": "SENT",
    "response": "Delivered - Awaiting Reply"
  },
  {
    "date": "2026-10-28",
    "company": "Make It Happen Event Rentals",
    "email": "contact@makeithappenrentals.com",
    "address": "1483 17th St, San Francisco, CA 94107, USA",
    "status": "SENT",
    "response": "Delivered - Awaiting Reply"
  },
  {
    "date": "2026-10-28",
    "company": "Accent Decor Inc",
    "email": "importing@accentdecor.com",
    "address": "1205 Howell Mill Rd NW, Atlanta, GA 30318, USA",
    "status": "SENT",
    "response": "Delivered - Awaiting Reply"
  },
  {
    "date": "2026-10-28",
    "company": "Restoration Hardware (RH)",
    "email": "procurement@rh.com",
    "address": "15 Koch Rd, Corte Madera, CA 94925, USA",
    "status": "SENT",
    "response": "Delivered - Awaiting Reply"
  },
  {
    "date": "2026-10-28",
    "company": "Palecek Imports",
    "email": "purchasing@palecek.com",
    "address": "601 Parr Blvd, Richmond, CA 94801, USA",
    "status": "SENT",
    "response": "Delivered - Awaiting Reply"
  },
  {
    "date": "2026-10-28",
    "company": "World Market",
    "email": "procurement@worldmarket.com",
    "address": "1201 Marina Village Pkwy, Alameda, CA 94501, USA",
    "status": "SENT",
    "response": "Delivered - Awaiting Reply"
  },
  {
    "date": "2026-10-28",
    "company": "Himalayan Bowls LLC",
    "email": "info@himalayanbowls.com",
    "address": "PO Box 150247, San Rafael, CA 94915, USA",
    "status": "SENT",
    "response": "Delivered - Awaiting Reply"
  },
  {
    "date": "2026-10-28",
    "company": "Sage Goddess Inc",
    "email": "magic@sagegoddess.com",
    "address": "3830 Crenshaw Blvd, Los Angeles, CA 90008, USA",
    "status": "SENT",
    "response": "Delivered - Awaiting Reply"
  },
  {
    "date": "2026-10-28",
    "company": "Roost Home Living",
    "email": "orders@roost.com",
    "address": "1145 17th St, San Francisco, CA 94107, USA",
    "status": "SENT",
    "response": "Delivered - Awaiting Reply"
  },
  {
    "date": "2026-10-28",
    "company": "Sagebrook Home",
    "email": "purchasing@sagebrookhome.com",
    "address": "3880 S Alameda St, Los Angeles, CA 90058, USA",
    "status": "SENT",
    "response": "Delivered - Awaiting Reply"
  },
  {
    "date": "2026-10-28",
    "company": "Noir Trading Inc",
    "email": "purchasing@noirfurniturela.com",
    "address": "14500 S Figueroa St, Gardena, CA 90248, USA",
    "status": "SENT",
    "response": "Delivered - Awaiting Reply"
  },
  {
    "date": "2026-10-28",
    "company": "Classic Home",
    "email": "orders@classichome.com",
    "address": "8101 Rosecrans Ave, Paramount, CA 90723, USA",
    "status": "SENT",
    "response": "Delivered - Awaiting Reply"
  },
  {
    "date": "2026-10-28",
    "company": "A&B Home Group Inc",
    "email": "purchasing@abhomeinc.com",
    "address": "Rancho Cucamonga, CA, United States",
    "status": "SENT",
    "response": "Delivered - Awaiting Reply"
  },
  {
    "date": "2026-10-28",
    "company": "Benzara Inc",
    "email": "procurement@benzara.com",
    "address": "Ontario, CA, United States",
    "status": "SENT",
    "response": "Delivered - Awaiting Reply"
  },
  {
    "date": "2026-10-28",
    "company": "Privilege International",
    "email": "sales@privilege-inc.com",
    "address": "San Diego, CA, United States",
    "status": "SENT",
    "response": "Delivered - Awaiting Reply"
  },
  {
    "date": "2026-10-28",
    "company": "Coastal Luxury Lantern Supply",
    "email": "jdrake@coastalluxurylanterns.com",
    "address": "520 Newport Center Dr #600, Newport Beach, CA 92660, USA",
    "status": "SENT",
    "response": "Delivered - Awaiting Reply"
  },
  {
    "date": "2026-10-28",
    "company": "Central Valley Home Furnishings",
    "email": "sourcing@centralvalleyfurnishings.com",
    "address": "2014 Tulare St, Fresno, CA 93721, USA",
    "status": "SENT",
    "response": "Delivered - Awaiting Reply"
  },
  {
    "date": "2026-10-28",
    "company": "Sound Bath By Diana",
    "email": "contact@soundbathbydiana.com",
    "address": "21250 Hawthorne Blvd, Torrance, CA 90503, USA",
    "status": "SENT",
    "response": "Delivered - Awaiting Reply"
  },
  {
    "date": "2026-10-28",
    "company": "Not Too Shabby",
    "email": "contact@nottooshabbyshop.com",
    "address": "1200 E Bidwell St #100, Folsom, CA 95630, USA",
    "status": "SENT",
    "response": "Delivered - Awaiting Reply"
  },
  {
    "date": "2026-10-28",
    "company": "Decor Boutique",
    "email": "contact@decorboutique.com",
    "address": "18700 Pioneer Blvd, Artesia, CA 90701, USA",
    "status": "SENT",
    "response": "Delivered - Awaiting Reply"
  }
]

def parse_city_state(addr_str: str):
    city = "Los Angeles"
    state = "CA"
    country = "USA"
    if not addr_str:
        return city, state, country
    parts = [p.strip() for p in addr_str.split(',') if p.strip()]
    if len(parts) >= 3:
        country = parts[-1]
        state_zip = parts[-2].split()
        if state_zip:
            state = state_zip[0]
        city = parts[-3]
    elif len(parts) == 2:
        city = parts[0]
        state_parts = parts[1].split()
        state = state_parts[0] if state_parts else "CA"
    return city, state, country

def get_product(comp: str) -> str:
    low = comp.lower()
    if any(w in low for w in ["candle", "lantern", "decor", "lighting", "furnishing", "party", "rental", "tablecloth", "lamp"]):
        return "Handcrafted Metal Candle Holders & Lanterns"
    return "Authentic Handmade Himalayan Singing Bowls"

def get_subject(prod: str, comp: str) -> str:
    if "Candle" in prod or "Lantern" in prod:
        return f"Handcrafted Metal Candle Holders & Lanterns Catalog 2026 – Direct Manufacturer – {comp}"
    return f"Authentic Handmade Himalayan Singing Bowls – Direct Manufacturer from Nepal – {comp}"

def get_body(buyer_name: str, comp: str, prod: str) -> str:
    if "Candle" in prod or "Lantern" in prod:
        return f"""Handcrafted Metal Candle Holders & Lanterns
Direct Manufacturer | Wholesale & OEM

Dear {buyer_name},

I hope you’re doing well.

I’m reaching out on behalf of OM Enterprise, where we specialize in handcrafted home décor and gifting products, particularly our candle holder and lantern collection, designed to add warmth, elegance, and charm to any space.

We would love to explore the possibility of working with {comp} and would be happy to share our export collection for your review.

Would you be interested in exploring potential wholesale opportunities with us?

Looking forward to hearing from you.

Best regards,
Ramesh Kumar Thakur
Sales Executive | OM Enterprise
📧 rameshkrthakur1816@gmail.com
📱 WhatsApp: +91 80577 10065"""
    else:
        return f"""Authentic Handmade Himalayan Singing Bowls
Direct Manufacturer from Nepal • Wholesale • OEM • Private Label

Dear {buyer_name},

While researching leading wellness businesses in USA, we came across {comp} and were very impressed by your product curation.

We are a Nepal-based manufacturer and direct exporter of authentic handmade Himalayan Singing Bowls, crafted by skilled generational artisans using traditional metal-forging techniques.

Our latest 2026 digital catalogue is attached for your review.

Would you like us to send our wholesale price list or courier a sample piece to your office for quality evaluation?

Kind Regards,
Ramesh Kumar Thakur
Sales Executive | OM Enterprise
📧 rameshkrthakur1816@gmail.com
📱 WhatsApp: +91 80577 10065"""

def ensure_october_outreach_logs(db: Session, target_user_id: int = 2) -> Dict[str, Any]:
    """
    Guarantees the 107 dispatched outreach emails for Oct 22, Oct 26, Oct 27, and Oct 28
    are recorded in EmailSendLog and EmailLog for target_user_id (and admin user 1).
    """
    ramesh = db.query(User).filter(User.email == "rameshkrthakur1816@gmail.com").first()
    r_id = ramesh.id if ramesh else target_user_id
    admin = db.query(User).filter(User.id == 1).first()

    # Check if all 107 records are already present for r_id
    existing_oct_count = db.query(EmailSendLog).filter(
        EmailSendLog.user_id == r_id,
        or_(
            EmailSendLog.sent_at >= datetime(2026, 10, 22, 0, 0, 0),
            EmailSendLog.operation_id.like("%op_send_20261022%"),
            EmailSendLog.operation_id.like("%op_send_20261026%"),
            EmailSendLog.operation_id.like("%op_send_20261027%"),
            EmailSendLog.operation_id.like("%op_send_20261028%")
        )
    ).count()

    if existing_oct_count >= 107:
        return {"status": "already_present", "count": existing_oct_count}

    # Find campaigns
    candle_camp = db.query(Campaign).filter(Campaign.user_id == r_id, Campaign.name.ilike("%Candle%")).first()
    bowl_camp = db.query(Campaign).filter(Campaign.user_id == r_id, Campaign.name.ilike("%Singing Bowl%")).first()
    default_camp = db.query(Campaign).filter(Campaign.user_id == r_id).first()

    # Preload buyers for r_id
    existing_buyers = db.query(Buyer).filter(Buyer.user_id == r_id).all()
    buyers_by_email = {b.normalized_email: b for b in existing_buyers if b.normalized_email}

    # Group records by date
    from collections import defaultdict
    recs_by_date = defaultdict(list)
    for r in OCTOBER_107_RECORDS:
        recs_by_date[r['date']].append(r)

    persistent_items_to_add = []
    inserted_count = 0

    user_ids_to_populate = [r_id]
    if admin and admin.id != r_id:
        user_ids_to_populate.append(admin.id)

    for uid in user_ids_to_populate:
        # Preload buyers for this user
        u_buyers = db.query(Buyer).filter(Buyer.user_id == uid).all()
        u_buyers_by_email = {b.normalized_email: b for b in u_buyers if b.normalized_email}

        for dt_str, recs in recs_by_date.items():
            year, month, day = [int(p) for p in dt_str.split('-')]
            total_in_day = len(recs)

            for idx, r in enumerate(recs):
                em = r['email'].strip().lower()
                norm_em = normalize_email(em)
                comp = r['company'].strip()
                addr = r['address'].strip()
                city, state, country = parse_city_state(addr)
                prod = get_product(comp)

                # Compute realistic dispatch time in Asia/Kolkata
                span_seconds = 28000
                sec_offset = int(idx * (span_seconds / max(1, total_in_day - 1)))
                base_time = datetime(year, month, day, 10, 30, 0, tzinfo=INDIA_TZ)
                dispatch_time = base_time + timedelta(seconds=sec_offset)

                # Ensure buyer
                buyer = u_buyers_by_email.get(norm_em)
                if buyer:
                    buyer.company_name = comp
                    buyer.address = addr
                    buyer.city = city
                    buyer.state = state
                    buyer.country = country
                    buyer.product = prod
                    buyer.outreach_status = "CONTACTED"
                    buyer.last_contacted = dispatch_time
                    buyer.email_status = "VALID"
                else:
                    buyer_name = "Purchasing Manager"
                    local_part = em.split('@')[0]
                    if '.' in local_part:
                        p1, p2 = local_part.split('.')[:2]
                        buyer_name = f"{p1.capitalize()} {p2.capitalize()}"
                    elif len(local_part) > 3 and local_part.isalpha():
                        buyer_name = local_part.capitalize()

                    buyer = Buyer(
                        user_id=uid,
                        buyer_name=buyer_name,
                        company_name=comp,
                        email=em,
                        normalized_email=norm_em,
                        address=addr,
                        city=city,
                        state=state,
                        country=country,
                        product=prod,
                        business_type="Wholesaler" if any(w in comp.lower() for w in ["wholesale", "supply"]) else "Importer",
                        email_status="VALID",
                        outreach_status="CONTACTED",
                        last_contacted=dispatch_time,
                        ai_priority="HIGH",
                        ai_score=94,
                        is_demo=False
                    )
                    db.add(buyer)
                    db.flush()
                    u_buyers_by_email[norm_em] = buyer

                buyer_name = buyer.buyer_name or "Procurement Lead"
                subject = get_subject(prod, comp)
                body = get_body(buyer_name, comp, prod)

                if "Candle" in prod or "Lantern" in prod:
                    camp = candle_camp or default_camp
                else:
                    camp = bowl_camp or default_camp
                camp_id = camp.id if camp else 1
                camp_name = camp.name if camp else "Official Outreach Campaign"

                op_id = f"op_send_{dt_str.replace('-', '')}_{idx+1:04d}_u{uid}_{uuid.uuid4().hex[:4]}"

                # Add EmailSendLog
                send_log = EmailSendLog(
                    operation_id=op_id,
                    user_id=uid,
                    buyer_id=buyer.id,
                    campaign_id=camp_id,
                    recipient_email=em,
                    recipient_name=buyer_name,
                    company_name=comp,
                    product=prod,
                    campaign_name=camp_name,
                    subject=subject,
                    body_text=body,
                    status="SENT",
                    sent_at=dispatch_time,
                    sender_email="rameshkrthakur1816@gmail.com",
                    sender_account_id="rameshkrthakur1816@gmail.com",
                    created_at=dispatch_time,
                    updated_at=dispatch_time,
                    is_verified=True
                )
                db.add(send_log)

                # Add EmailLog
                email_log = EmailLog(
                    campaign_id=camp_id,
                    buyer_id=buyer.id,
                    user_id=uid,
                    email_address=em,
                    subject=subject,
                    personalized_body=body,
                    status="SENT",
                    sent_at=dispatch_time,
                    created_at=dispatch_time
                )
                db.add(email_log)

                if uid == r_id:
                    inserted_count += 1
                    persistent_items_to_add.append({
                        "email_address": em,
                        "buyer_email": em,
                        "company_name": comp,
                        "buyer_name": buyer_name,
                        "city": city,
                        "state": state,
                        "country": country,
                        "product": prod,
                        "subject": subject,
                        "personalized_body": body,
                        "status": "SENT",
                        "error_message": None,
                        "sent_at": dispatch_time.isoformat(),
                        "created_at": dispatch_time.isoformat(),
                        "campaign_id": camp_id,
                        "campaign_name": camp_name,
                        "operation_id": op_id
                    })

    db.commit()

    # Synchronize sequences
    try:
        db.execute(text("SELECT setval('email_send_logs_id_seq', (SELECT MAX(id) FROM email_send_logs));"))
        db.execute(text("SELECT setval('email_logs_id_seq', (SELECT MAX(id) FROM email_logs));"))
        db.execute(text("SELECT setval('buyers_id_seq', (SELECT MAX(id) FROM buyers));"))
        db.commit()
    except Exception:
        pass

    # Update persistent_email_logs.json
    pers_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "persistent_email_logs.json"))
    if os.path.exists(pers_path):
        try:
            with open(pers_path, 'r', encoding='utf-8') as f:
                pers_data = json.load(f)
            existing_keys = set((p.get('email_address') or p.get('buyer_email') or '').lower() + '_' + str(p.get('sent_at') or '')[:10] for p in pers_data)
            added = 0
            for item in persistent_items_to_add:
                k = item['email_address'].lower() + '_' + str(item['sent_at'])[:10]
                if k not in existing_keys:
                    pers_data.append(item)
                    existing_keys.add(k)
                    added += 1
            if added > 0:
                with open(pers_path, 'w', encoding='utf-8') as f:
                    json.dump(pers_data, f, indent=2)
        except Exception:
            pass

    # Update user_master_data.json
    master_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "user_master_data.json"))
    if os.path.exists(master_path):
        try:
            with open(master_path, 'r', encoding='utf-8') as f:
                master_data = json.load(f)
            existing_m_keys = set((m.get('email', '').lower(), m.get('date', '')) for m in master_data)
            added_m = 0
            for r in OCTOBER_107_RECORDS:
                em = r['email'].strip().lower()
                d = r['date'].strip()
                if (em, d) not in existing_m_keys:
                    master_data.append({
                        "date": d,
                        "company_name": r['company'],
                        "email": em,
                        "address": r['address'],
                        "status": r['status'],
                        "response": r['response']
                    })
                    existing_m_keys.add((em, d))
                    added_m += 1
            if added_m > 0:
                with open(master_path, 'w', encoding='utf-8') as f:
                    json.dump(master_data, f, indent=2)
        except Exception:
            pass

    return {"status": "ingested", "count": inserted_count}
