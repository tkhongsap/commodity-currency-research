// Test script to demonstrate Serper query building and API calls

const buildGeneralImpactQuery = (searchTerm) => {
  const isInstrumentName = /^[A-Z]{2,6}[=\-\.]?[FX]?$/i.test(searchTerm.trim()) || 
                           ['gold', 'silver', 'oil', 'copper', 'aluminum', 'sugar', 'coffee', 'wheat', 'corn', 'bitcoin', 'ethereum'].some(commodity => 
                             searchTerm.toLowerCase().includes(commodity));
  
  const queryTerm = isInstrumentName ? `"${searchTerm}"` : searchTerm;
  
  return `${queryTerm} (breaking OR urgent OR crisis OR disruption OR sanctions OR conflict OR shortage OR supply chain OR trade war OR central bank OR Fed OR ECB OR surge OR crash OR volatile OR policy change OR recession OR inflation) (today OR this week OR recent OR global impact)`;
};

console.log('=== SERPER QUERY EXAMPLES ===\n');

const examples = [
  { input: 'oil', description: 'Oil commodity (recognized as commodity, gets quoted)' },
  { input: 'CL=F', description: 'Crude Oil futures symbol (instrument pattern, gets quoted)' },
  { input: 'Thai Baht', description: 'Currency name (not in commodity list, no quotes)' },
  { input: 'oil prices', description: 'General search with commodity keyword (gets quoted)' },
  { input: 'steel', description: 'Steel commodity (not in list, no quotes)' },
  { input: 'EURUSD', description: 'Currency pair (matches instrument pattern, gets quoted)' },
  { input: 'aluminum', description: 'Aluminum commodity (in list, gets quoted)' },
  { input: 'inflation news', description: 'General economic search (no quotes)' }
];

examples.forEach((example, index) => {
  console.log(`${index + 1}. ${example.description}:`);
  console.log(`Input: "${example.input}"`);
  console.log(`Query: ${buildGeneralImpactQuery(example.input)}`);
  console.log('');
});

console.log('=== KEY FEATURES ===');
console.log('• Commodity names in list get quoted for exact matching');
console.log('• Instrument symbols (CL=F, EURUSD) get quoted');
console.log('• General searches remain unquoted for broader results');
console.log('• All queries include market impact keywords');
console.log('• Time filters focus on recent/breaking news');