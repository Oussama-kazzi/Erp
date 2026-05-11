const mongoose = require('mongoose');

const companySettingsSchema = new mongoose.Schema({
  companyName:    { type: String, default: 'Atelier' },
  companyEmail:   { type: String, default: 'contact@atelier.ma' },
  companyPhone:   { type: String, default: '' },
  companyAddress: { type: String, default: '' },
  companyCity:    { type: String, default: 'Casablanca' },
  ice:            { type: String, default: '' },
  rc:             { type: String, default: '' },
  logoUrl:        { type: String, default: '' },
  primaryColor:   { type: String, default: '#1A1714' },
  secondaryColor: { type: String, default: '#B8936A' },
}, { timestamps: true });

module.exports = mongoose.model('CompanySettings', companySettingsSchema);
