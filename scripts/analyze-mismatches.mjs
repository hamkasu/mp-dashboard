/**
 * Analyze mismatches using pattern recognition and contextual clues
 * Since we can't access parliament.gov.my from this environment,
 * we use logical deduction from the audit data itself
 */

import * as fs from 'fs';

function extractCityFromAddress(address) {
  // Try to extract city/town from address
  const cityPatterns = [
    /(?:^|\n)([A-Z][a-zA-Z\s]+?),\s*\d{5}/,  // City, Postal Code
    /(?:Bandar|Kampung|Taman|Jalan)\s+([A-Za-z\s]+)/,  // Bandar/Kampung Name
    /([A-Z][a-z\s]+?),\s*\d+\s*[A-Z]/,  // Generic city pattern
  ];

  for (const pattern of cityPatterns) {
    const match = address.match(pattern);
    if (match) return match[1].trim();
  }
  return null;
}

function extractStateFromAddress(address) {
  const states = [
    'Johor', 'Kedah', 'Kelantan', 'Kuala Lumpur', 'Labuan', 'Melaka', 'Negeri Sembilan',
    'Pahang', 'Penang', 'Pulau Pinang', 'Perak', 'Perlis', 'Putrajaya', 'Sabah', 'Sarawak', 'Selangor', 'Terengganu'
  ];

  for (const state of states) {
    if (address.includes(state)) {
      return state;
    }
  }
  return null;
}

function analyzeEmailOwnership(email, mpName, mpCode) {
  // Analyze if email likely belongs to the given MP or someone else
  const emailLocal = email.split('@')[0].toLowerCase();
  const nameParts = mpName.toLowerCase().split(/\s+/);

  const reasons = [];

  // Check if email contains any part of MP's name
  let nameMatch = false;
  for (const part of nameParts) {
    if (part.length > 2 && emailLocal.includes(part)) {
      nameMatch = true;
      break;
    }
  }

  // Check for parliament code mismatch
  const codeInEmail = email.match(/p0?(\d+)/i);
  if (codeInEmail) {
    const extractedCode = 'P' + codeInEmail[1].padStart(3, '0');
    if (extractedCode !== mpCode) {
      reasons.push(`Email contains parliament code ${extractedCode}, but MP is ${mpCode}`);
      return { belongsToMp: false, confidence: 'HIGH', reasons };
    }
  }

  // Check if email looks generic/office-related
  if (emailLocal.includes('parlimen') || emailLocal.includes('mp') || emailLocal.includes('dap') || emailLocal.includes('umno')) {
    if (!nameMatch) {
      reasons.push('Generic parliament/party office email without MP name match');
      return { belongsToMp: false, confidence: 'MEDIUM', reasons };
    }
  }

  // Check for personal/different name
  if (!nameMatch && !emailLocal.includes('parliament') && !emailLocal.includes('mp')) {
    reasons.push(`Email (${emailLocal}) doesn't match MP name (${mpName})`);
    return { belongsToMp: false, confidence: 'MEDIUM', reasons };
  }

  if (nameMatch) {
    reasons.push(`Email contains part of MP's name`);
    return { belongsToMp: true, confidence: 'HIGH', reasons };
  }

  return { belongsToMp: 'UNCLEAR', confidence: 'LOW', reasons };
}

function analyzeAddressOwnership(address, mpConstituency, mpState) {
  // Check if address matches the MP's constituency/state
  const reasons = [];

  const stateInAddress = extractStateFromAddress(address);
  const stateMatch = stateInAddress === mpState;

  if (!stateMatch && stateInAddress) {
    reasons.push(`Address is in ${stateInAddress}, but MP is from ${mpState}`);
    return { belongsToMp: false, confidence: 'HIGH', reasons };
  }

  if (address.includes('Kementerian') || address.includes('Menteri') || address.includes('Putrajaya') || address.includes('Pejabat')) {
    if (address.includes('Kementerian') || address.includes('Menteri')) {
      reasons.push('Address is a ministry office (may be legitimate for cabinet members)');
      return { belongsToMp: 'MINISTRY_OFFICE', confidence: 'HIGH', reasons };
    }
  }

  if (address.includes(mpConstituency)) {
    reasons.push(`Address matches constituency (${mpConstituency})`);
    return { belongsToMp: true, confidence: 'HIGH', reasons };
  }

  return { belongsToMp: 'UNCLEAR', confidence: 'MEDIUM', reasons };
}

async function main() {
  console.log('Analyzing mismatches data...\n');
  const mismatches = JSON.parse(
    fs.readFileSync('/root/.claude/uploads/636ac469-07b2-52f4-b458-56e3800e20d2/e0e8fbf3-mismatches_for_review.json', 'utf-8')
  );

  console.log(`Analyzing ${mismatches.length} mismatched records...\n`);

  const comparisons = [];

  for (const mp of mismatches) {
    const emailAnalysis = analyzeEmailOwnership(mp.current_email, mp.name, mp.code);
    const addressAnalysis = analyzeAddressOwnership(mp.current_address, mp.constituency, mp.state);

    // Determine overall recommendation
    let recommendation = 'Review Manually';
    let confidence = 'Low';

    if (emailAnalysis.confidence === 'HIGH' && addressAnalysis.confidence === 'HIGH') {
      if (emailAnalysis.belongsToMp && (addressAnalysis.belongsToMp === true || addressAnalysis.belongsToMp === 'MINISTRY_OFFICE')) {
        recommendation = 'Data Likely Correct';
        confidence = 'High';
      } else if (!emailAnalysis.belongsToMp && !addressAnalysis.belongsToMp) {
        recommendation = 'DEFINITELY NEEDS CORRECTION';
        confidence = 'High';
      }
    } else if (emailAnalysis.belongsToMp === false || addressAnalysis.belongsToMp === false) {
      recommendation = 'NEEDS CORRECTION';
      confidence = 'High';
    } else if (addressAnalysis.belongsToMp === 'MINISTRY_OFFICE') {
      recommendation = 'Store Ministry Office + Get Constituency Office';
      confidence = 'Medium';
    }

    const diagnosis = [
      `Email: ${emailAnalysis.reasons.join('; ')}`,
      `Address: ${addressAnalysis.reasons.join('; ')}`,
    ].join(' | ');

    comparisons.push({
      mpName: mp.name,
      parliamentCode: mp.code,
      constituency: mp.constituency,
      state: mp.state,
      currentEmail: mp.current_email,
      currentAddress: mp.current_address.substring(0, 50),
      emailBelongsToMP: emailAnalysis.belongsToMp === true ? 'YES' : emailAnalysis.belongsToMp === false ? 'NO' : 'UNCLEAR',
      addressBelongsToMP: addressAnalysis.belongsToMp === true ? 'YES' : addressAnalysis.belongsToMp === 'MINISTRY_OFFICE' ? 'MINISTRY_OFFICE' : 'NO',
      confidence,
      diagnosis,
      recommendation,
    });
  }

  // Sort by recommendation priority
  const priorityOrder = { 'DEFINITELY NEEDS CORRECTION': 0, 'NEEDS CORRECTION': 1, 'Store Ministry Office + Get Constituency Office': 2, 'Review Manually': 3, 'Data Likely Correct': 4 };
  comparisons.sort((a, b) => (priorityOrder[a.recommendation] || 99) - (priorityOrder[b.recommendation] || 99));

  // Generate CSV
  const csvHeader = [
    'Priority',
    'MP Name',
    'Parliament Code',
    'Constituency',
    'State',
    'Current Email',
    'Current Address (truncated)',
    'Email Belongs to MP?',
    'Address Belongs to MP?',
    'Confidence',
    'Recommendation',
    'Diagnosis/Reasons'
  ].join(',');

  function escapeCSV(str) {
    if (str === null || str === undefined) return '""';
    str = String(str);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
  }

  let priority = 1;
  const csvRows = comparisons.map(r => {
    const currentPriority = r.recommendation === 'DEFINITELY NEEDS CORRECTION' || r.recommendation === 'NEEDS CORRECTION' ? priority++ : '';
    return [
      currentPriority,
      escapeCSV(r.mpName),
      r.parliamentCode,
      escapeCSV(r.constituency),
      r.state,
      escapeCSV(r.currentEmail),
      escapeCSV(r.currentAddress),
      r.emailBelongsToMP,
      r.addressBelongsToMP,
      r.confidence,
      escapeCSV(r.recommendation),
      escapeCSV(r.diagnosis),
    ].join(',');
  });

  const csv = [csvHeader, ...csvRows].join('\n');

  const outputPath = '/home/user/mp-dashboard/PRIORITY_0_CONTACT_COMPARISON.csv';
  fs.writeFileSync(outputPath, csv);

  console.log(`✅ Comparison data saved to: ${outputPath}\n`);

  // Print summary
  const needsCorrection = comparisons.filter(r => r.recommendation.includes('NEEDS CORRECTION')).length;
  const ministryOffice = comparisons.filter(r => r.recommendation.includes('Ministry Office')).length;
  const reviewManually = comparisons.filter(r => r.recommendation === 'Review Manually').length;
  const likelyCorrect = comparisons.filter(r => r.recommendation === 'Data Likely Correct').length;

  console.log('ANALYSIS SUMMARY:');
  console.log(`- Total records analyzed: ${comparisons.length}`);
  console.log(`- Definitely/Likely needs correction: ${needsCorrection}`);
  console.log(`- Ministry office addresses (need both addresses): ${ministryOffice}`);
  console.log(`- Requires manual review: ${reviewManually}`);
  console.log(`- Data likely correct: ${likelyCorrect}`);
  console.log(`\nTop 10 highest priority records (needing correction):`);

  comparisons
    .filter(r => r.recommendation.includes('NEEDS CORRECTION'))
    .slice(0, 10)
    .forEach((r, i) => {
      console.log(`${i + 1}. ${r.mpName} (${r.parliamentCode}): ${r.recommendation}`);
      console.log(`   Email: ${r.currentEmail} - ${r.emailBelongsToMP}`);
      console.log(`   Addr:  ${r.currentAddress}... - ${r.addressBelongsToMP}`);
    });
}

main().catch(console.error);
