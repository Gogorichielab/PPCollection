const fs = require('fs');
const os = require('os');
const path = require('path');
const request = require('supertest');

const { createApp } = require('../../src/app/createApp');

function testConfig(databasePath) {
  return {
    port: 0,
    sessionSecret: 'test-secret-load',
    adminUser: 'admin',
    adminPass: 'password123',
    databasePath
  };
}

function extractCsrfToken(html) {
  const match = html.match(/<input type="hidden" name="_csrf" value="([^"]+)"/);
  return match ? match[1] : null;
}

// Representative sample of 100 diverse firearms for load testing
const LOAD_TEST_FIREARMS = [
  { make: 'Glock', model: '17', serial: 'GEN5-001', caliber: '9mm', firearm_type: 'Pistol', status: 'Active', condition: 'New', location: 'Safe A', purchase_price: '599', purchase_date: '2020-01-15' },
  { make: 'Glock', model: '19', serial: 'GEN5-002', caliber: '9mm', firearm_type: 'Pistol', status: 'Active', condition: 'New', location: 'Safe A', purchase_price: '549', purchase_date: '2020-02-20' },
  { make: 'Glock', model: '43X', serial: 'GEN5-003', caliber: '9mm', firearm_type: 'Pistol', status: 'Active', condition: 'New', location: 'Safe A', purchase_price: '499', purchase_date: '2020-03-10' },
  { make: 'Glock', model: '20', serial: 'GEN4-001', caliber: '10mm', firearm_type: 'Pistol', status: 'Sold', condition: 'Used', location: '', purchase_price: '650', purchase_date: '2019-05-01' },
  { make: 'Glock', model: '21', serial: 'GEN4-002', caliber: '.45 ACP', firearm_type: 'Pistol', status: 'Active', condition: 'Used', location: 'Safe B', purchase_price: '580', purchase_date: '2019-08-14' },
  { make: 'Smith & Wesson', model: 'M&P9', serial: 'SW-001', caliber: '9mm', firearm_type: 'Pistol', status: 'Active', condition: 'New', location: 'Safe A', purchase_price: '569', purchase_date: '2021-01-05' },
  { make: 'Smith & Wesson', model: 'M&P Shield', serial: 'SW-002', caliber: '9mm', firearm_type: 'Pistol', status: 'Active', condition: 'New', location: 'Safe A', purchase_price: '449', purchase_date: '2021-03-22' },
  { make: 'Smith & Wesson', model: '686', serial: 'SW-686-001', caliber: '.357 Magnum', firearm_type: 'Revolver', status: 'Active', condition: 'New', location: 'Safe B', purchase_price: '899', purchase_date: '2021-06-18' },
  { make: 'Smith & Wesson', model: '629', serial: 'SW-629-001', caliber: '.44 Magnum', firearm_type: 'Revolver', status: 'Active', condition: 'Used', location: 'Safe B', purchase_price: '950', purchase_date: '2020-11-30' },
  { make: 'Smith & Wesson', model: 'Model 10', serial: 'SW-M10-001', caliber: '.38 Special', firearm_type: 'Revolver', status: 'Active', condition: 'Used', location: 'Safe C', purchase_price: '350', purchase_date: '2018-07-04' },
  { make: 'Sig Sauer', model: 'P320', serial: 'SIG-001', caliber: '9mm', firearm_type: 'Pistol', status: 'Active', condition: 'New', location: 'Safe A', purchase_price: '649', purchase_date: '2022-01-12' },
  { make: 'Sig Sauer', model: 'P365', serial: 'SIG-002', caliber: '9mm', firearm_type: 'Pistol', status: 'Active', condition: 'New', location: 'Safe A', purchase_price: '529', purchase_date: '2022-03-08' },
  { make: 'Sig Sauer', model: 'P226', serial: 'SIG-003', caliber: '9mm', firearm_type: 'Pistol', status: 'Active', condition: 'Used', location: 'Safe B', purchase_price: '1100', purchase_date: '2017-09-15' },
  { make: 'Sig Sauer', model: 'P229', serial: 'SIG-004', caliber: '.40 S&W', firearm_type: 'Pistol', status: 'Under Repair', condition: 'Used', location: 'Armorer', purchase_price: '1050', purchase_date: '2018-04-22' },
  { make: 'Sig Sauer', model: 'MCX', serial: 'SIG-MCX-001', caliber: '5.56 NATO', firearm_type: 'Rifle', status: 'Active', condition: 'New', location: 'Gun Room', purchase_price: '2499', purchase_date: '2023-02-14' },
  { make: 'Ruger', model: '10/22', serial: 'RGR-1022-001', caliber: '.22 LR', firearm_type: 'Rifle', status: 'Active', condition: 'New', location: 'Gun Room', purchase_price: '349', purchase_date: '2020-04-15' },
  { make: 'Ruger', model: 'Mini-14', serial: 'RGR-MINI-001', caliber: '5.56 NATO', firearm_type: 'Rifle', status: 'Active', condition: 'Used', location: 'Gun Room', purchase_price: '1099', purchase_date: '2019-12-01' },
  { make: 'Ruger', model: 'American Rifle', serial: 'RGR-AR-001', caliber: '.308 Win', firearm_type: 'Rifle', status: 'Active', condition: 'New', location: 'Gun Room', purchase_price: '549', purchase_date: '2021-10-20' },
  { make: 'Ruger', model: 'GP100', serial: 'RGR-GP-001', caliber: '.357 Magnum', firearm_type: 'Revolver', status: 'Active', condition: 'New', location: 'Safe B', purchase_price: '799', purchase_date: '2022-05-07' },
  { make: 'Ruger', model: 'LCP II', serial: 'RGR-LCP-001', caliber: '.380 ACP', firearm_type: 'Pistol', status: 'Active', condition: 'New', location: 'Safe A', purchase_price: '299', purchase_date: '2023-01-18' },
  { make: 'Remington', model: '870', serial: 'REM-870-001', caliber: '12 Gauge', firearm_type: 'Shotgun', status: 'Active', condition: 'New', location: 'Gun Room', purchase_price: '449', purchase_date: '2018-11-05' },
  { make: 'Remington', model: '870 Tactical', serial: 'REM-870T-001', caliber: '12 Gauge', firearm_type: 'Shotgun', status: 'Active', condition: 'New', location: 'Gun Room', purchase_price: '599', purchase_date: '2019-03-25' },
  { make: 'Remington', model: '700', serial: 'REM-700-001', caliber: '.30-06 Springfield', firearm_type: 'Rifle', status: 'Active', condition: 'Used', location: 'Gun Room', purchase_price: '950', purchase_date: '2015-09-10' },
  { make: 'Remington', model: '700 ADL', serial: 'REM-700A-001', caliber: '.308 Win', firearm_type: 'Rifle', status: 'Active', condition: 'New', location: 'Gun Room', purchase_price: '699', purchase_date: '2022-08-12' },
  { make: 'Mossberg', model: '500', serial: 'MOS-500-001', caliber: '12 Gauge', firearm_type: 'Shotgun', status: 'Active', condition: 'New', location: 'Gun Room', purchase_price: '399', purchase_date: '2020-07-04' },
  { make: 'Mossberg', model: '590A1', serial: 'MOS-590-001', caliber: '12 Gauge', firearm_type: 'Shotgun', status: 'Active', condition: 'New', location: 'Gun Room', purchase_price: '629', purchase_date: '2021-11-11' },
  { make: 'Mossberg', model: 'Patriot', serial: 'MOS-PAT-001', caliber: '6.5 Creedmoor', firearm_type: 'Rifle', status: 'Active', condition: 'New', location: 'Gun Room', purchase_price: '499', purchase_date: '2022-01-28' },
  { make: 'AR-15 Build', model: 'PSA Kit', serial: 'PSA-001', caliber: '5.56 NATO', firearm_type: 'Rifle', status: 'Active', condition: 'New', location: 'Gun Room', purchase_price: '699', purchase_date: '2021-04-01' },
  { make: 'Daniel Defense', model: 'DDM4 V7', serial: 'DD-DDM4-001', caliber: '5.56 NATO', firearm_type: 'Rifle', status: 'Active', condition: 'New', location: 'Gun Room', purchase_price: '1899', purchase_date: '2023-03-20' },
  { make: 'LWRC', model: 'IC-A5', serial: 'LWRC-ICA5-001', caliber: '5.56 NATO', firearm_type: 'Rifle', status: 'Active', condition: 'New', location: 'Gun Room', purchase_price: '2199', purchase_date: '2023-05-15' },
  { make: 'Heckler & Koch', model: 'VP9', serial: 'HK-VP9-001', caliber: '9mm', firearm_type: 'Pistol', status: 'Active', condition: 'New', location: 'Safe A', purchase_price: '749', purchase_date: '2021-07-14' },
  { make: 'Heckler & Koch', model: 'USP', serial: 'HK-USP-001', caliber: '9mm', firearm_type: 'Pistol', status: 'Active', condition: 'Used', location: 'Safe B', purchase_price: '950', purchase_date: '2016-02-29' },
  { make: 'Heckler & Koch', model: 'P30', serial: 'HK-P30-001', caliber: '9mm', firearm_type: 'Pistol', status: 'Active', condition: 'New', location: 'Safe A', purchase_price: '849', purchase_date: '2022-09-09' },
  { make: 'CZ', model: 'P-10 C', serial: 'CZ-P10C-001', caliber: '9mm', firearm_type: 'Pistol', status: 'Active', condition: 'New', location: 'Safe A', purchase_price: '499', purchase_date: '2021-12-12' },
  { make: 'CZ', model: '75 B', serial: 'CZ-75B-001', caliber: '9mm', firearm_type: 'Pistol', status: 'Active', condition: 'New', location: 'Safe A', purchase_price: '649', purchase_date: '2020-06-30' },
  { make: 'CZ', model: 'Scorpion EVO', serial: 'CZ-SCORP-001', caliber: '9mm', firearm_type: 'Rifle', status: 'Active', condition: 'New', location: 'Gun Room', purchase_price: '999', purchase_date: '2022-11-11' },
  { make: 'Springfield Armory', model: 'XD-M', serial: 'SA-XDM-001', caliber: '9mm', firearm_type: 'Pistol', status: 'Active', condition: 'New', location: 'Safe A', purchase_price: '569', purchase_date: '2020-09-25' },
  { make: 'Springfield Armory', model: 'Hellcat', serial: 'SA-HELLCAT-001', caliber: '9mm', firearm_type: 'Pistol', status: 'Active', condition: 'New', location: 'Safe A', purchase_price: '499', purchase_date: '2022-04-14' },
  { make: 'Springfield Armory', model: 'Saint AR-15', serial: 'SA-SAINT-001', caliber: '5.56 NATO', firearm_type: 'Rifle', status: 'Active', condition: 'New', location: 'Gun Room', purchase_price: '899', purchase_date: '2021-08-20' },
  { make: 'Walther', model: 'PDP', serial: 'WAL-PDP-001', caliber: '9mm', firearm_type: 'Pistol', status: 'Active', condition: 'New', location: 'Safe A', purchase_price: '649', purchase_date: '2022-06-03' },
  { make: 'Walther', model: 'PPK', serial: 'WAL-PPK-001', caliber: '.380 ACP', firearm_type: 'Pistol', status: 'Active', condition: 'Used', location: 'Safe C', purchase_price: '749', purchase_date: '2017-11-05' },
  { make: 'Beretta', model: 'M9', serial: 'BER-M9-001', caliber: '9mm', firearm_type: 'Pistol', status: 'Active', condition: 'Used', location: 'Safe B', purchase_price: '649', purchase_date: '2016-06-14' },
  { make: 'Beretta', model: 'PX4 Storm', serial: 'BER-PX4-001', caliber: '9mm', firearm_type: 'Pistol', status: 'Active', condition: 'New', location: 'Safe A', purchase_price: '599', purchase_date: '2020-10-31' },
  { make: 'Beretta', model: '1301 Tactical', serial: 'BER-1301-001', caliber: '12 Gauge', firearm_type: 'Shotgun', status: 'Active', condition: 'New', location: 'Gun Room', purchase_price: '1499', purchase_date: '2023-01-01' },
  { make: 'Browning', model: 'Hi-Power', serial: 'BRN-HIP-001', caliber: '9mm', firearm_type: 'Pistol', status: 'Active', condition: 'Used', location: 'Safe C', purchase_price: '1200', purchase_date: '2014-03-10' },
  { make: 'Browning', model: 'X-Bolt', serial: 'BRN-XBOLT-001', caliber: '.30-06 Springfield', firearm_type: 'Rifle', status: 'Active', condition: 'New', location: 'Gun Room', purchase_price: '999', purchase_date: '2022-02-28' },
  { make: 'Browning', model: 'Citori 725', serial: 'BRN-CIT-001', caliber: '12 Gauge', firearm_type: 'Shotgun', status: 'Active', condition: 'New', location: 'Gun Room', purchase_price: '3599', purchase_date: '2023-06-15' },
  { make: 'Winchester', model: 'Model 70', serial: 'WIN-M70-001', caliber: '.270 Win', firearm_type: 'Rifle', status: 'Active', condition: 'Used', location: 'Gun Room', purchase_price: '850', purchase_date: '2015-11-20' },
  { make: 'Winchester', model: 'SX4', serial: 'WIN-SX4-001', caliber: '12 Gauge', firearm_type: 'Shotgun', status: 'Active', condition: 'New', location: 'Gun Room', purchase_price: '949', purchase_date: '2022-07-07' },
  { make: 'Winchester', model: 'Model 94', serial: 'WIN-M94-001', caliber: '.30-30 Win', firearm_type: 'Rifle', status: 'Active', condition: 'Used', location: 'Gun Room', purchase_price: '1250', purchase_date: '2010-05-05' },
  { make: 'Marlin', model: '336', serial: 'MAR-336-001', caliber: '.30-30 Win', firearm_type: 'Rifle', status: 'Active', condition: 'Used', location: 'Gun Room', purchase_price: '700', purchase_date: '2012-09-01' },
  { make: 'Henry', model: 'Big Boy', serial: 'HEN-BB-001', caliber: '.44 Magnum', firearm_type: 'Rifle', status: 'Active', condition: 'New', location: 'Gun Room', purchase_price: '1099', purchase_date: '2023-04-22' },
  { make: 'Henry', model: 'Golden Boy', serial: 'HEN-GB-001', caliber: '.22 LR', firearm_type: 'Rifle', status: 'Active', condition: 'New', location: 'Gun Room', purchase_price: '599', purchase_date: '2021-09-17' },
  { make: 'Tikka', model: 'T3x Lite', serial: 'TIK-T3X-001', caliber: '6.5 Creedmoor', firearm_type: 'Rifle', status: 'Active', condition: 'New', location: 'Gun Room', purchase_price: '849', purchase_date: '2022-10-10' },
  { make: 'Tikka', model: 'T3x TAC A1', serial: 'TIK-TAC-001', caliber: '.308 Win', firearm_type: 'Rifle', status: 'Active', condition: 'New', location: 'Gun Room', purchase_price: '1999', purchase_date: '2023-07-04' },
  { make: 'Savage Arms', model: 'Axis II', serial: 'SAV-AXIS-001', caliber: '.308 Win', firearm_type: 'Rifle', status: 'Active', condition: 'New', location: 'Gun Room', purchase_price: '449', purchase_date: '2020-12-25' },
  { make: 'Savage Arms', model: 'Model 10', serial: 'SAV-M10-001', caliber: '6.5 Creedmoor', firearm_type: 'Rifle', status: 'Active', condition: 'New', location: 'Gun Room', purchase_price: '799', purchase_date: '2022-03-15' },
  { make: 'Christensen Arms', model: 'Mesa', serial: 'CA-MESA-001', caliber: '6.5 Creedmoor', firearm_type: 'Rifle', status: 'Active', condition: 'New', location: 'Gun Room', purchase_price: '1499', purchase_date: '2023-02-01' },
  { make: 'Kimber', model: '1911 Custom II', serial: 'KIM-1911-001', caliber: '.45 ACP', firearm_type: 'Pistol', status: 'Active', condition: 'New', location: 'Safe B', purchase_price: '999', purchase_date: '2021-05-16' },
  { make: 'Kimber', model: 'Micro 9', serial: 'KIM-M9-001', caliber: '9mm', firearm_type: 'Pistol', status: 'Active', condition: 'New', location: 'Safe A', purchase_price: '749', purchase_date: '2022-08-08' },
  { make: 'Colt', model: '1911 Government', serial: 'COLT-1911-001', caliber: '.45 ACP', firearm_type: 'Pistol', status: 'Active', condition: 'Used', location: 'Safe C', purchase_price: '1199', purchase_date: '2008-07-04' },
  { make: 'Colt', model: 'Python', serial: 'COLT-PY-001', caliber: '.357 Magnum', firearm_type: 'Revolver', status: 'Active', condition: 'New', location: 'Safe B', purchase_price: '1499', purchase_date: '2021-02-14' },
  { make: 'Colt', model: 'Anaconda', serial: 'COLT-ANA-001', caliber: '.44 Magnum', firearm_type: 'Revolver', status: 'Active', condition: 'New', location: 'Safe B', purchase_price: '1699', purchase_date: '2022-12-01' },
  { make: 'Taurus', model: 'G3', serial: 'TAU-G3-001', caliber: '9mm', firearm_type: 'Pistol', status: 'Active', condition: 'New', location: 'Safe A', purchase_price: '349', purchase_date: '2021-11-28' },
  { make: 'Taurus', model: 'Judge', serial: 'TAU-JDG-001', caliber: '.45 Colt/.410', firearm_type: 'Revolver', status: 'Active', condition: 'New', location: 'Safe B', purchase_price: '549', purchase_date: '2020-05-15' },
  { make: 'Taurus', model: '605', serial: 'TAU-605-001', caliber: '.357 Magnum', firearm_type: 'Revolver', status: 'Sold', condition: 'Used', location: '', purchase_price: '399', purchase_date: '2018-01-01' },
  { make: 'Charter Arms', model: 'Undercover', serial: 'CHA-UC-001', caliber: '.38 Special', firearm_type: 'Revolver', status: 'Active', condition: 'Used', location: 'Safe C', purchase_price: '299', purchase_date: '2016-10-31' },
  { make: 'Kel-Tec', model: 'KSG', serial: 'KT-KSG-001', caliber: '12 Gauge', firearm_type: 'Shotgun', status: 'Active', condition: 'New', location: 'Gun Room', purchase_price: '999', purchase_date: '2022-04-20' },
  { make: 'Kel-Tec', model: 'Sub-2000', serial: 'KT-SUB2K-001', caliber: '9mm', firearm_type: 'Rifle', status: 'Active', condition: 'New', location: 'Gun Room', purchase_price: '499', purchase_date: '2021-01-21' },
  { make: 'Canik', model: 'TP9SF', serial: 'CAN-TP9-001', caliber: '9mm', firearm_type: 'Pistol', status: 'Active', condition: 'New', location: 'Safe A', purchase_price: '389', purchase_date: '2020-07-14' },
  { make: 'IWI', model: 'Tavor X95', serial: 'IWI-X95-001', caliber: '5.56 NATO', firearm_type: 'Rifle', status: 'Active', condition: 'New', location: 'Gun Room', purchase_price: '1999', purchase_date: '2023-01-15' },
  { make: 'FN', model: 'FN 509', serial: 'FN-509-001', caliber: '9mm', firearm_type: 'Pistol', status: 'Active', condition: 'New', location: 'Safe A', purchase_price: '649', purchase_date: '2022-05-05' },
  { make: 'FN', model: 'SCAR 16S', serial: 'FN-SCAR-001', caliber: '5.56 NATO', firearm_type: 'Rifle', status: 'Active', condition: 'New', location: 'Gun Room', purchase_price: '3499', purchase_date: '2023-03-01' },
  { make: 'FN', model: 'Five-seveN', serial: 'FN-57-001', caliber: '5.7x28mm', firearm_type: 'Pistol', status: 'Active', condition: 'New', location: 'Safe B', purchase_price: '1349', purchase_date: '2022-11-25' },
  { make: 'Arsenal', model: 'SAM7F', serial: 'ARS-SAM7-001', caliber: '7.62x39mm', firearm_type: 'Rifle', status: 'Active', condition: 'New', location: 'Gun Room', purchase_price: '1299', purchase_date: '2021-06-06' },
  { make: 'WASR-10', model: 'AK-47', serial: 'WASR-001', caliber: '7.62x39mm', firearm_type: 'Rifle', status: 'Active', condition: 'Used', location: 'Gun Room', purchase_price: '699', purchase_date: '2019-07-07' },
  { make: 'Stag Arms', model: 'Stag-15', serial: 'STAG-15-001', caliber: '5.56 NATO', firearm_type: 'Rifle', status: 'Active', condition: 'New', location: 'Gun Room', purchase_price: '899', purchase_date: '2022-09-09' },
  { make: 'BCM', model: 'RECCE-16 MCMR', serial: 'BCM-R16-001', caliber: '5.56 NATO', firearm_type: 'Rifle', status: 'Active', condition: 'New', location: 'Gun Room', purchase_price: '1499', purchase_date: '2023-04-04' },
  { make: 'Aero Precision', model: 'M4E1', serial: 'AP-M4E1-001', caliber: '5.56 NATO', firearm_type: 'Rifle', status: 'Active', condition: 'New', location: 'Gun Room', purchase_price: '1199', purchase_date: '2022-06-16' },
  { make: 'Wilson Combat', model: 'Bill Wilson Carry', serial: 'WC-BWC-001', caliber: '9mm', firearm_type: 'Pistol', status: 'Active', condition: 'New', location: 'Safe B', purchase_price: '2895', purchase_date: '2023-05-01' },
  { make: 'Les Baer', model: '1911 Premier II', serial: 'LB-PII-001', caliber: '.45 ACP', firearm_type: 'Pistol', status: 'Active', condition: 'New', location: 'Safe B', purchase_price: '2595', purchase_date: '2022-10-20' },
  { make: 'Nighthawk Custom', model: 'T3', serial: 'NHC-T3-001', caliber: '9mm', firearm_type: 'Pistol', status: 'Active', condition: 'New', location: 'Safe B', purchase_price: '3295', purchase_date: '2023-06-01' },
  { make: 'Staccato', model: 'P', serial: 'STA-P-001', caliber: '9mm', firearm_type: 'Pistol', status: 'Active', condition: 'New', location: 'Safe A', purchase_price: '1699', purchase_date: '2022-12-15' },
  { make: 'Staccato', model: 'C2', serial: 'STA-C2-001', caliber: '9mm', firearm_type: 'Pistol', status: 'Active', condition: 'New', location: 'Safe A', purchase_price: '1399', purchase_date: '2023-02-20' },
  { make: 'Kahr Arms', model: 'CW9', serial: 'KHR-CW9-001', caliber: '9mm', firearm_type: 'Pistol', status: 'Active', condition: 'New', location: 'Safe A', purchase_price: '449', purchase_date: '2021-03-03' },
  { make: 'Diamondback', model: 'DB9', serial: 'DB-DB9-001', caliber: '9mm', firearm_type: 'Pistol', status: 'Lost/Stolen', condition: 'New', location: '', purchase_price: '299', purchase_date: '2020-08-08' },
  { make: 'Ruger', model: 'Super Redhawk', serial: 'RGR-SRH-001', caliber: '.454 Casull', firearm_type: 'Revolver', status: 'Active', condition: 'New', location: 'Safe B', purchase_price: '1149', purchase_date: '2022-07-20' },
  { make: 'Smith & Wesson', model: '460 XVR', serial: 'SW-460-001', caliber: '.460 S&W Magnum', firearm_type: 'Revolver', status: 'Active', condition: 'New', location: 'Safe B', purchase_price: '1599', purchase_date: '2023-03-10' },
  { make: 'Taurus', model: 'Raging Hunter', serial: 'TAU-RH-001', caliber: '.44 Magnum', firearm_type: 'Revolver', status: 'Active', condition: 'New', location: 'Safe B', purchase_price: '799', purchase_date: '2022-01-17' },
  { make: 'Mossberg', model: 'Shockwave', serial: 'MOS-SHK-001', caliber: '12 Gauge', firearm_type: 'Shotgun', status: 'Active', condition: 'New', location: 'Gun Room', purchase_price: '499', purchase_date: '2021-05-05' },
  { make: 'Benelli', model: 'M4', serial: 'BEN-M4-001', caliber: '12 Gauge', firearm_type: 'Shotgun', status: 'Active', condition: 'New', location: 'Gun Room', purchase_price: '1899', purchase_date: '2023-01-30' },
  { make: 'Benelli', model: 'Super Black Eagle 3', serial: 'BEN-SBE3-001', caliber: '12 Gauge', firearm_type: 'Shotgun', status: 'Active', condition: 'New', location: 'Gun Room', purchase_price: '1799', purchase_date: '2022-09-20' },
  { make: 'Franchi', model: 'Affinity 3', serial: 'FRA-AFF3-001', caliber: '12 Gauge', firearm_type: 'Shotgun', status: 'Active', condition: 'New', location: 'Gun Room', purchase_price: '949', purchase_date: '2022-05-25' },
  { make: 'Stoeger', model: 'M3000', serial: 'STG-M3K-001', caliber: '12 Gauge', firearm_type: 'Shotgun', status: 'Active', condition: 'New', location: 'Gun Room', purchase_price: '649', purchase_date: '2021-08-30' },
  { make: 'Hatfield', model: 'SAS', serial: 'HAT-SAS-001', caliber: '20 Gauge', firearm_type: 'Shotgun', status: 'Active', condition: 'New', location: 'Gun Room', purchase_price: '299', purchase_date: '2020-11-15' },
  { make: 'Glock', model: '26', serial: 'GEN5-026-001', caliber: '9mm', firearm_type: 'Pistol', status: 'Active', condition: 'New', location: 'Safe A', purchase_price: '539', purchase_date: '2021-04-10' },
  { make: 'Glock', model: '34', serial: 'GEN5-034-001', caliber: '9mm', firearm_type: 'Pistol', status: 'Active', condition: 'New', location: 'Safe B', purchase_price: '699', purchase_date: '2022-02-22' },
  { make: 'Smith & Wesson', model: 'CSX', serial: 'SW-CSX-001', caliber: '9mm', firearm_type: 'Pistol', status: 'Active', condition: 'New', location: 'Safe A', purchase_price: '499', purchase_date: '2022-10-05' },
  { make: 'Ruger', model: 'Wrangler', serial: 'RGR-WRG-001', caliber: '.22 LR', firearm_type: 'Revolver', status: 'Active', condition: 'New', location: 'Safe C', purchase_price: '249', purchase_date: '2023-08-10' },
  { make: 'Glock', model: '48', serial: 'GEN5-048-001', caliber: '9mm', firearm_type: 'Pistol', status: 'Active', condition: 'New', location: 'Safe A', purchase_price: '519', purchase_date: '2023-09-05' }
];

describe('load test — 100 firearms', () => {
  let app;
  let dbPath;
  let agent;

  beforeAll(async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ppcollection-load-'));
    dbPath = path.join(tempDir, 'app.db');
    app = await createApp({ config: testConfig(dbPath) });
    agent = request.agent(app);

    const loginPage = await agent.get('/login');
    const loginCsrfToken = extractCsrfToken(loginPage.text);

    await agent
      .post('/login')
      .type('form')
      .send({ username: 'admin', password: 'password123', _csrf: loginCsrfToken });

    const changePasswordPage = await agent.get('/change-password');
    const changeCsrfToken = extractCsrfToken(changePasswordPage.text);

    await agent
      .post('/change-password')
      .type('form')
      .send({
        current_password: 'password123',
        new_password: 'newSecurePassword123',
        confirm_password: 'newSecurePassword123',
        _csrf: changeCsrfToken
      });
  }, 30000);

  afterAll(() => {
    app.locals.db.close();
    const dir = path.dirname(dbPath);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  test('inserts 100 diverse firearms successfully', async () => {
    const newPage = await agent.get('/firearms/new');
    const csrfToken = extractCsrfToken(newPage.text);

    for (const firearm of LOAD_TEST_FIREARMS) {
      const response = await agent
        .post('/firearms')
        .type('form')
        .send({ ...firearm, _csrf: csrfToken });

      expect(response.status).toBe(302);
    }

    // Verify all 100 were inserted via the inventory page
    const listPage = await agent.get('/firearms');
    expect(listPage.status).toBe(200);
    expect(listPage.text).toContain('Showing 1 to 25 of 100');
    expect(listPage.text).toContain('Page 1 of 4');
  }, 60000);

  test('inventory paginates correctly across all 4 pages', async () => {
    const page1 = await agent.get('/firearms?page=1');
    expect(page1.status).toBe(200);
    expect(page1.text).toContain('Showing 1 to 25 of 100');
    expect(page1.text).toContain('Page 1 of 4');
    expect(page1.text).toContain('Next →');

    const page2 = await agent.get('/firearms?page=2');
    expect(page2.status).toBe(200);
    expect(page2.text).toContain('Showing 26 to 50 of 100');
    expect(page2.text).toContain('Page 2 of 4');

    const page3 = await agent.get('/firearms?page=3');
    expect(page3.status).toBe(200);
    expect(page3.text).toContain('Showing 51 to 75 of 100');
    expect(page3.text).toContain('Page 3 of 4');

    const page4 = await agent.get('/firearms?page=4');
    expect(page4.status).toBe(200);
    expect(page4.text).toContain('Showing 76 to 100 of 100');
    expect(page4.text).toContain('Page 4 of 4');
    expect(page4.text).toContain('← Previous');
  });

  test('CSV export contains all 100 firearms', async () => {
    const response = await agent.get('/firearms/export');
    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('text/csv');
    expect(response.headers['content-disposition']).toContain('attachment; filename="firearms.csv"');

    // Header row + 100 data rows
    const lines = response.text.trim().split('\n');
    expect(lines.length).toBe(101);
    expect(lines[0]).toBe('Make,Model,Serial,Caliber,Purchase Date,Purchase Price,Condition,Location,Status,Notes');
  });

  test('dashboard reflects correct totals for 100 firearms', async () => {
    const dashboardResponse = await agent.get('/');
    expect(dashboardResponse.status).toBe(200);
    // The stats section renders totalFirearms as a stat value
    expect(dashboardResponse.text).toContain('home-stat-value');
    expect(dashboardResponse.text).toMatch(/>100</);
  });

  test('inventory page renders within acceptable time for 100 records', async () => {
    const start = Date.now();
    const response = await agent.get('/firearms');
    const elapsed = Date.now() - start;

    expect(response.status).toBe(200);
    // Inventory page with 100 records (paginated to 25) should render in under 500ms
    expect(elapsed).toBeLessThan(500);
  });

  test('individual firearm detail page renders correctly', async () => {
    // Get any firearm from page 1
    const listPage = await agent.get('/firearms?page=1');
    const idMatch = listPage.text.match(/href="\/firearms\/(\d+)"/);
    expect(idMatch).not.toBeNull();

    const firearmId = idMatch[1];
    const detailPage = await agent.get(`/firearms/${firearmId}`);
    expect(detailPage.status).toBe(200);
    // Detail page title format: "<Make> <Model> — Pew Pew Collection"
    expect(detailPage.text).toMatch(/<title>.+ — Pew Pew Collection<\/title>/);
  });

  test('status badges are present in inventory for diverse statuses', async () => {
    const page1 = await agent.get('/firearms?page=1');
    expect(page1.status).toBe(200);
    // Multiple status types should be represented somewhere across the inventory
    expect(page1.text).toContain('badge badge-accent');
  });

  test('type badges are present in inventory for diverse firearm types', async () => {
    const page1 = await agent.get('/firearms?page=1');
    expect(page1.status).toBe(200);
    expect(page1.text).toContain('badge badge-outline');
  });
});
