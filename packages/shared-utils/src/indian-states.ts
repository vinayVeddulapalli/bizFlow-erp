export interface IndianState {
  code: string;
  name: string;
}

export const INDIAN_STATES: Record<string, IndianState> = {
  '01': { code: '01', name: 'Jammu and Kashmir' },
  '02': { code: '02', name: 'Himachal Pradesh' },
  '03': { code: '03', name: 'Punjab' },
  '04': { code: '04', name: 'Chandigarh' },
  '05': { code: '05', name: 'Uttarakhand' },
  '06': { code: '06', name: 'Haryana' },
  '07': { code: '07', name: 'Delhi' },
  '08': { code: '08', name: 'Rajasthan' },
  '09': { code: '09', name: 'Uttar Pradesh' },
  '10': { code: '10', name: 'Bihar' },
  '11': { code: '11', name: 'Sikkim' },
  '12': { code: '12', name: 'Arunachal Pradesh' },
  '13': { code: '13', name: 'Nagaland' },
  '14': { code: '14', name: 'Manipur' },
  '15': { code: '15', name: 'Mizoram' },
  '16': { code: '16', name: 'Tripura' },
  '17': { code: '17', name: 'Meghalaya' },
  '18': { code: '18', name: 'Assam' },
  '19': { code: '19', name: 'West Bengal' },
  '20': { code: '20', name: 'Jharkhand' },
  '21': { code: '21', name: 'Odisha' },
  '22': { code: '22', name: 'Chhattisgarh' },
  '23': { code: '23', name: 'Madhya Pradesh' },
  '24': { code: '24', name: 'Gujarat' },
  '26': { code: '26', name: 'Dadra and Nagar Haveli and Daman and Diu' },
  '27': { code: '27', name: 'Maharashtra' },
  '29': { code: '29', name: 'Karnataka' },
  '30': { code: '30', name: 'Goa' },
  '31': { code: '31', name: 'Lakshadweep' },
  '32': { code: '32', name: 'Kerala' },
  '33': { code: '33', name: 'Tamil Nadu' },
  '34': { code: '34', name: 'Puducherry' },
  '35': { code: '35', name: 'Andaman and Nicobar Islands' },
  '36': { code: '36', name: 'Telangana' },
  '37': { code: '37', name: 'Andhra Pradesh' },
  '38': { code: '38', name: 'Ladakh' },
  '97': { code: '97', name: 'Other Territory' },
};

export function getStateByCode(code: string): IndianState | undefined {
  return INDIAN_STATES[code];
}

export function getStateFromGstin(gstin: string): IndianState | undefined {
  if (!gstin || gstin.length < 2) return undefined;
  const stateCode = gstin.substring(0, 2);
  return INDIAN_STATES[stateCode];
}
