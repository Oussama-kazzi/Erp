import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../api';

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
      const res = await api.get('/settings');
      setCompany({ ...COMPANY_DEFAULTS, ...res.data });
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
