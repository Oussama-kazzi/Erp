import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

const CompanyContext = createContext(null);

export const COMPANY_DEFAULTS = {
  companyName:    'Atelier',
  companyEmail:   'contact@atelier.ma',
  companyPhone:   '',
  companyAddress: '',
  companyCity:    'Casablanca',
  ice:            '',
  rc:             '',
  logoUrl:        '',
  primaryColor:   '#1A1714',
  secondaryColor: '#B8936A',
};

export const CompanyProvider = ({ children }) => {
  const [company, setCompany] = useState(COMPANY_DEFAULTS);

  const refresh = useCallback(async () => {
    try {
      const { data } = await supabase.from('company_settings').select('*').eq('id', 1).single();
      if (data) {
        setCompany({
          companyName:    data.company_name    || COMPANY_DEFAULTS.companyName,
          companyEmail:   data.company_email   || COMPANY_DEFAULTS.companyEmail,
          companyPhone:   data.company_phone   || '',
          companyAddress: data.company_address || '',
          companyCity:    data.company_city    || COMPANY_DEFAULTS.companyCity,
          ice:            data.ice             || '',
          rc:             data.rc              || '',
          logoUrl:        data.logo_url        || '',
          primaryColor:   data.primary_color   || COMPANY_DEFAULTS.primaryColor,
          secondaryColor: data.secondary_color || COMPANY_DEFAULTS.secondaryColor,
        });
      }
    } catch { /* use defaults */ }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return (
    <CompanyContext.Provider value={{ company, setCompany, refresh }}>
      {children}
    </CompanyContext.Provider>
  );
};

export const useCompany = () => useContext(CompanyContext);
