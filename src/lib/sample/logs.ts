/** Example purchase log entries, shown until Phase 5 records real ones. */
export const SAMPLE_LOGS = [
  { id: 'l3', name: 'Kangkong', qty: '2 tali', when: 'Today', unit: '₱20 per tali', price: 40, status: 'added' as const },
  { id: 'l2', name: 'Itlog', qty: '12 pcs', when: 'Yesterday', unit: '₱8.50 each', price: 102, status: 'added' as const },
  { id: 'l1', name: 'Bangus', qty: '1 kg', when: 'Oct 4', unit: '₱240 per kg', price: 240, status: 'added' as const },
];
