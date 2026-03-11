'use client';

import { useMemo, useState } from 'react';

interface UnicodeChar {
  cp: number;
  name: string;
  cat: string;
}

// Named characters with proper Unicode names
const NAMED: UnicodeChar[] = [
  // Currency
  { cp: 0x0024, name: 'DOLLAR SIGN', cat: 'Currency' },
  { cp: 0x00A2, name: 'CENT SIGN', cat: 'Currency' },
  { cp: 0x00A3, name: 'POUND SIGN', cat: 'Currency' },
  { cp: 0x00A5, name: 'YEN SIGN', cat: 'Currency' },
  { cp: 0x20AC, name: 'EURO SIGN', cat: 'Currency' },
  { cp: 0x20BF, name: 'BITCOIN SIGN', cat: 'Currency' },
  { cp: 0x20B9, name: 'INDIAN RUPEE SIGN', cat: 'Currency' },
  { cp: 0x20A9, name: 'WON SIGN', cat: 'Currency' },
  { cp: 0x20A3, name: 'FRENCH FRANC SIGN', cat: 'Currency' },
  { cp: 0x00A4, name: 'CURRENCY SIGN', cat: 'Currency' },
  // Symbols
  { cp: 0x00A9, name: 'COPYRIGHT SIGN', cat: 'Symbols' },
  { cp: 0x00AE, name: 'REGISTERED SIGN', cat: 'Symbols' },
  { cp: 0x2122, name: 'TRADE MARK SIGN', cat: 'Symbols' },
  { cp: 0x00B0, name: 'DEGREE SIGN', cat: 'Symbols' },
  { cp: 0x00B1, name: 'PLUS-MINUS SIGN', cat: 'Symbols' },
  { cp: 0x00D7, name: 'MULTIPLICATION SIGN', cat: 'Symbols' },
  { cp: 0x00F7, name: 'DIVISION SIGN', cat: 'Symbols' },
  { cp: 0x221E, name: 'INFINITY', cat: 'Symbols' },
  { cp: 0x2205, name: 'EMPTY SET', cat: 'Symbols' },
  { cp: 0x2260, name: 'NOT EQUAL TO', cat: 'Symbols' },
  { cp: 0x2264, name: 'LESS-THAN OR EQUAL TO', cat: 'Symbols' },
  { cp: 0x2265, name: 'GREATER-THAN OR EQUAL TO', cat: 'Symbols' },
  { cp: 0x2248, name: 'ALMOST EQUAL TO', cat: 'Symbols' },
  { cp: 0x2261, name: 'IDENTICAL TO', cat: 'Symbols' },
  { cp: 0x221A, name: 'SQUARE ROOT', cat: 'Symbols' },
  { cp: 0x2202, name: 'PARTIAL DIFFERENTIAL', cat: 'Symbols' },
  { cp: 0x2207, name: 'NABLA', cat: 'Symbols' },
  { cp: 0x2211, name: 'N-ARY SUMMATION', cat: 'Symbols' },
  { cp: 0x220F, name: 'N-ARY PRODUCT', cat: 'Symbols' },
  { cp: 0x222B, name: 'INTEGRAL', cat: 'Symbols' },
  { cp: 0x2126, name: 'OHM SIGN', cat: 'Symbols' },
  { cp: 0x2103, name: 'DEGREE CELSIUS', cat: 'Symbols' },
  { cp: 0x2109, name: 'DEGREE FAHRENHEIT', cat: 'Symbols' },
  { cp: 0x00B5, name: 'MICRO SIGN', cat: 'Symbols' },
  { cp: 0x2030, name: 'PER MILLE SIGN', cat: 'Symbols' },
  { cp: 0x2031, name: 'PER TEN THOUSAND SIGN', cat: 'Symbols' },
  // Punctuation
  { cp: 0x2014, name: 'EM DASH', cat: 'Punctuation' },
  { cp: 0x2013, name: 'EN DASH', cat: 'Punctuation' },
  { cp: 0x2018, name: 'LEFT SINGLE QUOTATION MARK', cat: 'Punctuation' },
  { cp: 0x2019, name: 'RIGHT SINGLE QUOTATION MARK', cat: 'Punctuation' },
  { cp: 0x201C, name: 'LEFT DOUBLE QUOTATION MARK', cat: 'Punctuation' },
  { cp: 0x201D, name: 'RIGHT DOUBLE QUOTATION MARK', cat: 'Punctuation' },
  { cp: 0x2026, name: 'HORIZONTAL ELLIPSIS', cat: 'Punctuation' },
  { cp: 0x00B7, name: 'MIDDLE DOT', cat: 'Punctuation' },
  { cp: 0x2022, name: 'BULLET', cat: 'Punctuation' },
  { cp: 0x2023, name: 'TRIANGULAR BULLET', cat: 'Punctuation' },
  { cp: 0x00AB, name: 'LEFT-POINTING DOUBLE ANGLE QUOTATION MARK', cat: 'Punctuation' },
  { cp: 0x00BB, name: 'RIGHT-POINTING DOUBLE ANGLE QUOTATION MARK', cat: 'Punctuation' },
  { cp: 0x2039, name: 'SINGLE LEFT-POINTING ANGLE QUOTATION MARK', cat: 'Punctuation' },
  { cp: 0x203A, name: 'SINGLE RIGHT-POINTING ANGLE QUOTATION MARK', cat: 'Punctuation' },
  { cp: 0x00A7, name: 'SECTION SIGN', cat: 'Punctuation' },
  { cp: 0x00B6, name: 'PILCROW SIGN', cat: 'Punctuation' },
  { cp: 0x2020, name: 'DAGGER', cat: 'Punctuation' },
  { cp: 0x2021, name: 'DOUBLE DAGGER', cat: 'Punctuation' },
  // Greek uppercase
  { cp: 0x0391, name: 'GREEK CAPITAL LETTER ALPHA', cat: 'Greek' },
  { cp: 0x0392, name: 'GREEK CAPITAL LETTER BETA', cat: 'Greek' },
  { cp: 0x0393, name: 'GREEK CAPITAL LETTER GAMMA', cat: 'Greek' },
  { cp: 0x0394, name: 'GREEK CAPITAL LETTER DELTA', cat: 'Greek' },
  { cp: 0x0395, name: 'GREEK CAPITAL LETTER EPSILON', cat: 'Greek' },
  { cp: 0x0396, name: 'GREEK CAPITAL LETTER ZETA', cat: 'Greek' },
  { cp: 0x0397, name: 'GREEK CAPITAL LETTER ETA', cat: 'Greek' },
  { cp: 0x0398, name: 'GREEK CAPITAL LETTER THETA', cat: 'Greek' },
  { cp: 0x0399, name: 'GREEK CAPITAL LETTER IOTA', cat: 'Greek' },
  { cp: 0x039A, name: 'GREEK CAPITAL LETTER KAPPA', cat: 'Greek' },
  { cp: 0x039B, name: 'GREEK CAPITAL LETTER LAMBDA', cat: 'Greek' },
  { cp: 0x039C, name: 'GREEK CAPITAL LETTER MU', cat: 'Greek' },
  { cp: 0x039D, name: 'GREEK CAPITAL LETTER NU', cat: 'Greek' },
  { cp: 0x039E, name: 'GREEK CAPITAL LETTER XI', cat: 'Greek' },
  { cp: 0x039F, name: 'GREEK CAPITAL LETTER OMICRON', cat: 'Greek' },
  { cp: 0x03A0, name: 'GREEK CAPITAL LETTER PI', cat: 'Greek' },
  { cp: 0x03A1, name: 'GREEK CAPITAL LETTER RHO', cat: 'Greek' },
  { cp: 0x03A3, name: 'GREEK CAPITAL LETTER SIGMA', cat: 'Greek' },
  { cp: 0x03A4, name: 'GREEK CAPITAL LETTER TAU', cat: 'Greek' },
  { cp: 0x03A5, name: 'GREEK CAPITAL LETTER UPSILON', cat: 'Greek' },
  { cp: 0x03A6, name: 'GREEK CAPITAL LETTER PHI', cat: 'Greek' },
  { cp: 0x03A7, name: 'GREEK CAPITAL LETTER CHI', cat: 'Greek' },
  { cp: 0x03A8, name: 'GREEK CAPITAL LETTER PSI', cat: 'Greek' },
  { cp: 0x03A9, name: 'GREEK CAPITAL LETTER OMEGA', cat: 'Greek' },
  // Greek lowercase
  { cp: 0x03B1, name: 'GREEK SMALL LETTER ALPHA', cat: 'Greek' },
  { cp: 0x03B2, name: 'GREEK SMALL LETTER BETA', cat: 'Greek' },
  { cp: 0x03B3, name: 'GREEK SMALL LETTER GAMMA', cat: 'Greek' },
  { cp: 0x03B4, name: 'GREEK SMALL LETTER DELTA', cat: 'Greek' },
  { cp: 0x03B5, name: 'GREEK SMALL LETTER EPSILON', cat: 'Greek' },
  { cp: 0x03B6, name: 'GREEK SMALL LETTER ZETA', cat: 'Greek' },
  { cp: 0x03B7, name: 'GREEK SMALL LETTER ETA', cat: 'Greek' },
  { cp: 0x03B8, name: 'GREEK SMALL LETTER THETA', cat: 'Greek' },
  { cp: 0x03B9, name: 'GREEK SMALL LETTER IOTA', cat: 'Greek' },
  { cp: 0x03BA, name: 'GREEK SMALL LETTER KAPPA', cat: 'Greek' },
  { cp: 0x03BB, name: 'GREEK SMALL LETTER LAMBDA', cat: 'Greek' },
  { cp: 0x03BC, name: 'GREEK SMALL LETTER MU', cat: 'Greek' },
  { cp: 0x03BD, name: 'GREEK SMALL LETTER NU', cat: 'Greek' },
  { cp: 0x03BE, name: 'GREEK SMALL LETTER XI', cat: 'Greek' },
  { cp: 0x03BF, name: 'GREEK SMALL LETTER OMICRON', cat: 'Greek' },
  { cp: 0x03C0, name: 'GREEK SMALL LETTER PI', cat: 'Greek' },
  { cp: 0x03C1, name: 'GREEK SMALL LETTER RHO', cat: 'Greek' },
  { cp: 0x03C3, name: 'GREEK SMALL LETTER SIGMA', cat: 'Greek' },
  { cp: 0x03C4, name: 'GREEK SMALL LETTER TAU', cat: 'Greek' },
  { cp: 0x03C5, name: 'GREEK SMALL LETTER UPSILON', cat: 'Greek' },
  { cp: 0x03C6, name: 'GREEK SMALL LETTER PHI', cat: 'Greek' },
  { cp: 0x03C7, name: 'GREEK SMALL LETTER CHI', cat: 'Greek' },
  { cp: 0x03C8, name: 'GREEK SMALL LETTER PSI', cat: 'Greek' },
  { cp: 0x03C9, name: 'GREEK SMALL LETTER OMEGA', cat: 'Greek' },
  // Arrows
  { cp: 0x2190, name: 'LEFTWARDS ARROW', cat: 'Arrows' },
  { cp: 0x2191, name: 'UPWARDS ARROW', cat: 'Arrows' },
  { cp: 0x2192, name: 'RIGHTWARDS ARROW', cat: 'Arrows' },
  { cp: 0x2193, name: 'DOWNWARDS ARROW', cat: 'Arrows' },
  { cp: 0x2194, name: 'LEFT RIGHT ARROW', cat: 'Arrows' },
  { cp: 0x2195, name: 'UP DOWN ARROW', cat: 'Arrows' },
  { cp: 0x2196, name: 'NORTH WEST ARROW', cat: 'Arrows' },
  { cp: 0x2197, name: 'NORTH EAST ARROW', cat: 'Arrows' },
  { cp: 0x2198, name: 'SOUTH EAST ARROW', cat: 'Arrows' },
  { cp: 0x2199, name: 'SOUTH WEST ARROW', cat: 'Arrows' },
  { cp: 0x219A, name: 'LEFTWARDS ARROW WITH STROKE', cat: 'Arrows' },
  { cp: 0x219B, name: 'RIGHTWARDS ARROW WITH STROKE', cat: 'Arrows' },
  { cp: 0x21A4, name: 'LEFTWARDS ARROW FROM BAR', cat: 'Arrows' },
  { cp: 0x21A6, name: 'RIGHTWARDS ARROW FROM BAR', cat: 'Arrows' },
  { cp: 0x21B0, name: 'UPWARDS ARROW WITH TIP LEFTWARDS', cat: 'Arrows' },
  { cp: 0x21B1, name: 'UPWARDS ARROW WITH TIP RIGHTWARDS', cat: 'Arrows' },
  { cp: 0x21B2, name: 'DOWNWARDS ARROW WITH TIP LEFTWARDS', cat: 'Arrows' },
  { cp: 0x21B3, name: 'DOWNWARDS ARROW WITH TIP RIGHTWARDS', cat: 'Arrows' },
  { cp: 0x21BA, name: 'ANTICLOCKWISE OPEN CIRCLE ARROW', cat: 'Arrows' },
  { cp: 0x21BB, name: 'CLOCKWISE OPEN CIRCLE ARROW', cat: 'Arrows' },
  { cp: 0x21BC, name: 'LEFTWARDS HARPOON WITH BARB UPWARDS', cat: 'Arrows' },
  { cp: 0x21C0, name: 'RIGHTWARDS HARPOON WITH BARB UPWARDS', cat: 'Arrows' },
  { cp: 0x21CC, name: 'RIGHTWARDS HARPOON OVER LEFTWARDS HARPOON', cat: 'Arrows' },
  { cp: 0x21D0, name: 'LEFTWARDS DOUBLE ARROW', cat: 'Arrows' },
  { cp: 0x21D1, name: 'UPWARDS DOUBLE ARROW', cat: 'Arrows' },
  { cp: 0x21D2, name: 'RIGHTWARDS DOUBLE ARROW', cat: 'Arrows' },
  { cp: 0x21D3, name: 'DOWNWARDS DOUBLE ARROW', cat: 'Arrows' },
  { cp: 0x21D4, name: 'LEFT RIGHT DOUBLE ARROW', cat: 'Arrows' },
  { cp: 0x21E6, name: 'LEFTWARDS WHITE ARROW', cat: 'Arrows' },
  { cp: 0x21E7, name: 'UPWARDS WHITE ARROW', cat: 'Arrows' },
  { cp: 0x21E8, name: 'RIGHTWARDS WHITE ARROW', cat: 'Arrows' },
  { cp: 0x21E9, name: 'DOWNWARDS WHITE ARROW', cat: 'Arrows' },
  // Geometric Shapes
  { cp: 0x25A0, name: 'BLACK SQUARE', cat: 'Geometric' },
  { cp: 0x25A1, name: 'WHITE SQUARE', cat: 'Geometric' },
  { cp: 0x25AA, name: 'BLACK SMALL SQUARE', cat: 'Geometric' },
  { cp: 0x25AB, name: 'WHITE SMALL SQUARE', cat: 'Geometric' },
  { cp: 0x25B2, name: 'BLACK UP-POINTING TRIANGLE', cat: 'Geometric' },
  { cp: 0x25B3, name: 'WHITE UP-POINTING TRIANGLE', cat: 'Geometric' },
  { cp: 0x25B6, name: 'BLACK RIGHT-POINTING TRIANGLE', cat: 'Geometric' },
  { cp: 0x25B7, name: 'WHITE RIGHT-POINTING TRIANGLE', cat: 'Geometric' },
  { cp: 0x25BC, name: 'BLACK DOWN-POINTING TRIANGLE', cat: 'Geometric' },
  { cp: 0x25BD, name: 'WHITE DOWN-POINTING TRIANGLE', cat: 'Geometric' },
  { cp: 0x25C0, name: 'BLACK LEFT-POINTING TRIANGLE', cat: 'Geometric' },
  { cp: 0x25C1, name: 'WHITE LEFT-POINTING TRIANGLE', cat: 'Geometric' },
  { cp: 0x25C6, name: 'BLACK DIAMOND', cat: 'Geometric' },
  { cp: 0x25C7, name: 'WHITE DIAMOND', cat: 'Geometric' },
  { cp: 0x25CB, name: 'WHITE CIRCLE', cat: 'Geometric' },
  { cp: 0x25CF, name: 'BLACK CIRCLE', cat: 'Geometric' },
  { cp: 0x25D0, name: 'CIRCLE WITH LEFT HALF BLACK', cat: 'Geometric' },
  { cp: 0x25D1, name: 'CIRCLE WITH RIGHT HALF BLACK', cat: 'Geometric' },
  { cp: 0x25D6, name: 'LEFT HALF BLACK CIRCLE', cat: 'Geometric' },
  { cp: 0x25D7, name: 'RIGHT HALF BLACK CIRCLE', cat: 'Geometric' },
  { cp: 0x25E6, name: 'WHITE BULLET', cat: 'Geometric' },
  { cp: 0x25FC, name: 'BLACK MEDIUM SQUARE', cat: 'Geometric' },
  { cp: 0x25FD, name: 'WHITE MEDIUM SMALL SQUARE', cat: 'Geometric' },
  { cp: 0x25FE, name: 'BLACK MEDIUM SMALL SQUARE', cat: 'Geometric' },
  // Misc Symbols
  { cp: 0x2600, name: 'BLACK SUN WITH RAYS', cat: 'Symbols' },
  { cp: 0x2601, name: 'CLOUD', cat: 'Symbols' },
  { cp: 0x2602, name: 'UMBRELLA', cat: 'Symbols' },
  { cp: 0x2603, name: 'SNOWMAN', cat: 'Symbols' },
  { cp: 0x2604, name: 'COMET', cat: 'Symbols' },
  { cp: 0x2605, name: 'BLACK STAR', cat: 'Symbols' },
  { cp: 0x2606, name: 'WHITE STAR', cat: 'Symbols' },
  { cp: 0x260E, name: 'BLACK TELEPHONE', cat: 'Symbols' },
  { cp: 0x2610, name: 'BALLOT BOX', cat: 'Symbols' },
  { cp: 0x2611, name: 'BALLOT BOX WITH CHECK', cat: 'Symbols' },
  { cp: 0x2612, name: 'BALLOT BOX WITH X', cat: 'Symbols' },
  { cp: 0x2614, name: 'UMBRELLA WITH RAIN DROPS', cat: 'Symbols' },
  { cp: 0x2615, name: 'HOT BEVERAGE', cat: 'Symbols' },
  { cp: 0x261B, name: 'BLACK RIGHT POINTING INDEX', cat: 'Symbols' },
  { cp: 0x261C, name: 'WHITE LEFT POINTING INDEX', cat: 'Symbols' },
  { cp: 0x261D, name: 'WHITE UP POINTING INDEX', cat: 'Symbols' },
  { cp: 0x261E, name: 'WHITE RIGHT POINTING INDEX', cat: 'Symbols' },
  { cp: 0x2620, name: 'SKULL AND CROSSBONES', cat: 'Symbols' },
  { cp: 0x2621, name: 'CAUTION SIGN', cat: 'Symbols' },
  { cp: 0x2622, name: 'RADIOACTIVE SIGN', cat: 'Symbols' },
  { cp: 0x2623, name: 'BIOHAZARD SIGN', cat: 'Symbols' },
  { cp: 0x262F, name: 'YIN YANG', cat: 'Symbols' },
  { cp: 0x2639, name: 'WHITE FROWNING FACE', cat: 'Symbols' },
  { cp: 0x263A, name: 'WHITE SMILING FACE', cat: 'Symbols' },
  { cp: 0x263B, name: 'BLACK SMILING FACE', cat: 'Symbols' },
  { cp: 0x2640, name: 'FEMALE SIGN', cat: 'Symbols' },
  { cp: 0x2642, name: 'MALE SIGN', cat: 'Symbols' },
  { cp: 0x2660, name: 'BLACK SPADE SUIT', cat: 'Symbols' },
  { cp: 0x2661, name: 'WHITE HEART SUIT', cat: 'Symbols' },
  { cp: 0x2662, name: 'WHITE DIAMOND SUIT', cat: 'Symbols' },
  { cp: 0x2663, name: 'BLACK CLUB SUIT', cat: 'Symbols' },
  { cp: 0x2665, name: 'BLACK HEART SUIT', cat: 'Symbols' },
  { cp: 0x2666, name: 'BLACK DIAMOND SUIT', cat: 'Symbols' },
  { cp: 0x2668, name: 'HOT SPRINGS', cat: 'Symbols' },
  { cp: 0x267B, name: 'BLACK UNIVERSAL RECYCLING SYMBOL', cat: 'Symbols' },
  { cp: 0x267F, name: 'WHEELCHAIR SYMBOL', cat: 'Symbols' },
  { cp: 0x2690, name: 'WHITE FLAG', cat: 'Symbols' },
  { cp: 0x2691, name: 'BLACK FLAG', cat: 'Symbols' },
  { cp: 0x26A0, name: 'WARNING SIGN', cat: 'Symbols' },
  { cp: 0x26A1, name: 'HIGH VOLTAGE SIGN', cat: 'Symbols' },
  // Dingbats / checkmarks
  { cp: 0x2713, name: 'CHECK MARK', cat: 'Dingbats' },
  { cp: 0x2714, name: 'HEAVY CHECK MARK', cat: 'Dingbats' },
  { cp: 0x2715, name: 'MULTIPLICATION X', cat: 'Dingbats' },
  { cp: 0x2716, name: 'HEAVY MULTIPLICATION X', cat: 'Dingbats' },
  { cp: 0x2717, name: 'BALLOT X', cat: 'Dingbats' },
  { cp: 0x2718, name: 'HEAVY BALLOT X', cat: 'Dingbats' },
  { cp: 0x2720, name: 'MALTESE CROSS', cat: 'Dingbats' },
  { cp: 0x2726, name: 'BLACK FOUR POINTED STAR', cat: 'Dingbats' },
  { cp: 0x2727, name: 'WHITE FOUR POINTED STAR', cat: 'Dingbats' },
  { cp: 0x272A, name: 'CIRCLED WHITE STAR', cat: 'Dingbats' },
  { cp: 0x2730, name: 'SHADOWED WHITE STAR', cat: 'Dingbats' },
  { cp: 0x2733, name: 'EIGHT SPOKED ASTERISK', cat: 'Dingbats' },
  { cp: 0x2734, name: 'EIGHT POINTED BLACK STAR', cat: 'Dingbats' },
  { cp: 0x2735, name: 'EIGHT POINTED PINWHEEL STAR', cat: 'Dingbats' },
  { cp: 0x2736, name: 'SIX POINTED BLACK STAR', cat: 'Dingbats' },
  { cp: 0x2764, name: 'HEAVY BLACK HEART', cat: 'Dingbats' },
  { cp: 0x2765, name: 'ROTATED HEAVY BLACK HEART BULLET', cat: 'Dingbats' },
  { cp: 0x2794, name: 'HEAVY WIDE-HEADED RIGHTWARDS ARROW', cat: 'Dingbats' },
  { cp: 0x27A1, name: 'BLACK RIGHTWARDS ARROW', cat: 'Dingbats' },
  { cp: 0x27B0, name: 'CURLY LOOP', cat: 'Dingbats' },
  // Math
  { cp: 0x2200, name: 'FOR ALL', cat: 'Math' },
  { cp: 0x2203, name: 'THERE EXISTS', cat: 'Math' },
  { cp: 0x2204, name: 'THERE DOES NOT EXIST', cat: 'Math' },
  { cp: 0x2208, name: 'ELEMENT OF', cat: 'Math' },
  { cp: 0x2209, name: 'NOT AN ELEMENT OF', cat: 'Math' },
  { cp: 0x220B, name: 'CONTAINS AS MEMBER', cat: 'Math' },
  { cp: 0x2212, name: 'MINUS SIGN', cat: 'Math' },
  { cp: 0x2213, name: 'MINUS-OR-PLUS SIGN', cat: 'Math' },
  { cp: 0x2218, name: 'RING OPERATOR', cat: 'Math' },
  { cp: 0x2219, name: 'BULLET OPERATOR', cat: 'Math' },
  { cp: 0x221D, name: 'PROPORTIONAL TO', cat: 'Math' },
  { cp: 0x2220, name: 'ANGLE', cat: 'Math' },
  { cp: 0x2225, name: 'PARALLEL TO', cat: 'Math' },
  { cp: 0x2226, name: 'NOT PARALLEL TO', cat: 'Math' },
  { cp: 0x2227, name: 'LOGICAL AND', cat: 'Math' },
  { cp: 0x2228, name: 'LOGICAL OR', cat: 'Math' },
  { cp: 0x2229, name: 'INTERSECTION', cat: 'Math' },
  { cp: 0x222A, name: 'UNION', cat: 'Math' },
  { cp: 0x2234, name: 'THEREFORE', cat: 'Math' },
  { cp: 0x2235, name: 'BECAUSE', cat: 'Math' },
  { cp: 0x223C, name: 'TILDE OPERATOR', cat: 'Math' },
  { cp: 0x2243, name: 'ASYMPTOTICALLY EQUAL TO', cat: 'Math' },
  { cp: 0x2245, name: 'APPROXIMATELY EQUAL TO', cat: 'Math' },
  { cp: 0x2247, name: 'NEITHER APPROXIMATELY NOR ACTUALLY EQUAL TO', cat: 'Math' },
  { cp: 0x224C, name: 'ALL EQUAL TO', cat: 'Math' },
  { cp: 0x2250, name: 'APPROACHES THE LIMIT', cat: 'Math' },
  { cp: 0x2252, name: 'APPROXIMATELY EQUAL TO OR THE IMAGE OF', cat: 'Math' },
  { cp: 0x2254, name: 'COLON EQUALS', cat: 'Math' },
  { cp: 0x226A, name: 'MUCH LESS-THAN', cat: 'Math' },
  { cp: 0x226B, name: 'MUCH GREATER-THAN', cat: 'Math' },
  { cp: 0x2282, name: 'SUBSET OF', cat: 'Math' },
  { cp: 0x2283, name: 'SUPERSET OF', cat: 'Math' },
  { cp: 0x2284, name: 'NOT A SUBSET OF', cat: 'Math' },
  { cp: 0x2286, name: 'SUBSET OF OR EQUAL TO', cat: 'Math' },
  { cp: 0x2287, name: 'SUPERSET OF OR EQUAL TO', cat: 'Math' },
  { cp: 0x2295, name: 'CIRCLED PLUS', cat: 'Math' },
  { cp: 0x2296, name: 'CIRCLED MINUS', cat: 'Math' },
  { cp: 0x2297, name: 'CIRCLED TIMES', cat: 'Math' },
  { cp: 0x22A2, name: 'RIGHT TACK', cat: 'Math' },
  { cp: 0x22A3, name: 'LEFT TACK', cat: 'Math' },
  { cp: 0x22A4, name: 'DOWN TACK', cat: 'Math' },
  { cp: 0x22A5, name: 'UP TACK', cat: 'Math' },
  { cp: 0x22BB, name: 'XOR', cat: 'Math' },
  { cp: 0x22BC, name: 'NAND', cat: 'Math' },
  { cp: 0x22BD, name: 'NOR', cat: 'Math' },
];

// Generate Basic Latin + Latin-1 from ranges
function generateRangeChars(): UnicodeChar[] {
  const chars: UnicodeChar[] = [];
  const ranges: { start: number; end: number; cat: string }[] = [
    { start: 0x0021, end: 0x007E, cat: 'Basic Latin' },
    { start: 0x00A0, end: 0x00FF, cat: 'Latin-1' },
  ];
  for (const { start, end, cat } of ranges) {
    for (let cp = start; cp <= end; cp++) {
      const char = String.fromCodePoint(cp);
      if (!char.trim() && cp !== 0x00A0) continue;
      chars.push({ cp, name: `U+${cp.toString(16).toUpperCase().padStart(4, '0')}`, cat });
    }
  }
  return chars;
}

const ALL_CHARS: UnicodeChar[] = (() => {
  const rangeChars = generateRangeChars();
  const rangeCps = new Set(rangeChars.map((c) => c.cp));
  return [...rangeChars, ...NAMED.filter((c) => !rangeCps.has(c.cp))];
})();
const CATEGORIES = ['All', ...new Set(ALL_CHARS.map((c) => c.cat))].filter(
  (c) => !['Basic Latin', 'Latin-1'].includes(c),
);
const ALL_CATEGORIES_FOR_FILTER = ['All', 'Basic Latin', 'Latin-1', ...CATEGORIES.slice(1)];

export default function Unicode() {
  const [search, setSearch] = useState('');
  const [cat, setCat] = useState('All');
  const [copied, setCopied] = useState<number | null>(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return ALL_CHARS.filter((c) => {
      const matchesCat = cat === 'All' || c.cat === cat;
      const matchesSearch =
        !q ||
        c.name.toLowerCase().includes(q) ||
        `u+${c.cp.toString(16).padStart(4, '0')}`.includes(q) ||
        String.fromCodePoint(c.cp).includes(search);
      return matchesCat && matchesSearch;
    }).slice(0, 500);
  }, [search, cat]);

  const copy = async (c: UnicodeChar, type: 'char' | 'cp') => {
    const text =
      type === 'char'
        ? String.fromCodePoint(c.cp)
        : `U+${c.cp.toString(16).toUpperCase().padStart(4, '0')}`;
    await navigator.clipboard.writeText(text);
    setCopied(c.cp * 2 + (type === 'char' ? 0 : 1));
    setTimeout(() => setCopied(null), 1200);
  };

  return (
    <div style={{ paddingTop: '2rem', paddingBottom: '2rem' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-fg)', marginBottom: '0.25rem' }}>
        Unicode Character Search
      </h1>
      <p style={{ color: 'var(--color-muted)', marginBottom: '1.25rem', fontSize: '0.9rem' }}>
        Unicode文字を名前やコードポイントで検索。クリックでコピーできます。
      </p>

      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="名前・コードポイント (U+0041)・文字で検索..."
          style={{
            flex: 1,
            minWidth: 220,
            padding: '0.5rem 0.75rem',
            borderRadius: 8,
            border: '1px solid color-mix(in srgb, var(--color-fg) 15%, transparent)',
            background: 'color-mix(in srgb, var(--color-fg) 5%, transparent)',
            color: 'var(--color-fg)',
            fontSize: '0.875rem',
            outline: 'none',
          }}
        />
        <select
          value={cat}
          onChange={(e) => setCat(e.target.value)}
          style={{
            padding: '0.5rem 0.75rem',
            borderRadius: 8,
            border: '1px solid color-mix(in srgb, var(--color-fg) 15%, transparent)',
            background: 'color-mix(in srgb, var(--color-fg) 5%, transparent)',
            color: 'var(--color-fg)',
            fontSize: '0.875rem',
            outline: 'none',
            cursor: 'pointer',
          }}
        >
          {ALL_CATEGORIES_FOR_FILTER.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      <div style={{ fontSize: '0.8rem', color: 'var(--color-muted)', marginBottom: '0.75rem' }}>
        {filtered.length}文字{filtered.length === 500 ? ' (先頭500件を表示)' : ''}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(min(200px, 100%), 1fr))',
          gap: '0.4rem',
        }}
      >
        {filtered.map((c) => {
          const char = String.fromCodePoint(c.cp);
          const cpStr = `U+${c.cp.toString(16).toUpperCase().padStart(4, '0')}`;
          const copiedChar = copied === c.cp * 2;
          const copiedCp = copied === c.cp * 2 + 1;

          return (
            <div
              key={c.cp}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem 0.6rem',
                borderRadius: 8,
                border: '1px solid color-mix(in srgb, var(--color-fg) 10%, transparent)',
                background: 'color-mix(in srgb, var(--color-fg) 2%, transparent)',
              }}
            >
              <button
                onClick={() => copy(c, 'char')}
                title={`Copy "${char}"`}
                style={{
                  width: 36,
                  height: 36,
                  minWidth: 36,
                  borderRadius: 6,
                  border: '1px solid color-mix(in srgb, var(--color-fg) 12%, transparent)',
                  background: copiedChar ? 'var(--color-accent)' : 'color-mix(in srgb, var(--color-fg) 6%, transparent)',
                  color: copiedChar ? '#fff' : 'var(--color-fg)',
                  fontSize: '1.1rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  lineHeight: 1,
                  fontFamily: 'sans-serif',
                }}
              >
                {char}
              </button>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: '0.7rem',
                    color: 'var(--color-muted)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {c.name}
                </div>
                <button
                  onClick={() => copy(c, 'cp')}
                  title={`Copy "${cpStr}"`}
                  style={{
                    padding: 0,
                    border: 'none',
                    background: 'transparent',
                    color: copiedCp ? 'var(--color-accent)' : 'var(--color-muted)',
                    fontFamily: 'monospace',
                    fontSize: '0.7rem',
                    cursor: 'pointer',
                  }}
                >
                  {cpStr}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
