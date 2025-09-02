// Constants and Configuration
export const CONFIG = {
  API_URL: 'https://marhbackend-production.up.railway.app/api',
  LOCAL_STORAGE_KEYS: {
    TOKEN: 'MARH_TOKEN',
    PROTOCOL: 'marh_protocol'
  },
  SESSION_STORAGE_KEYS: {
    MFA_EMAIL: 'MFA_EMAIL'
  }
};

export const ROLES = {
  ADMIN: 'ADMIN',
  RH: 'RH',
  GESTOR: 'GESTOR',
  COLAB: 'COLAB'
};

export const NAVIGATION_CONFIG = {
  [ROLES.ADMIN]: [
    ['view-dashboard','📊 Dashboard'],
    ['view-employees','👥 Colaboradores'],
    ['view-depts','🏢 Departamentos'],
    ['view-att','🕒 Presenças'],
    ['view-leaves','🏖️ Afastamentos'],
    ['view-payroll','💸 Folha'],
    ['view-reviews','📈 Avaliações'],
    ['view-train','🎓 Treinamentos'],
    ['view-jobs','📋 Vagas'],
    ['view-cand','🧑‍💼 Candidatos'],
    ['view-protocol','📋 Protocolo'],
    ['view-reports','📑 Relatórios'],
    ['view-audit','🗂️ Logs'],
    ['view-settings','⚙️ Usuários']
  ],
  [ROLES.RH]: [
    ['view-dashboard','📊 Dashboard'],
    ['view-employees','👥 Colaboradores'],
    ['view-depts','🏢 Departamentos'],
    ['view-att','🕒 Presenças'],
    ['view-leaves','🏖️ Afastamentos'],
    ['view-payroll','💸 Folha'],
    ['view-reviews','📈 Avaliações'],
    ['view-train','🎓 Treinamentos'],
    ['view-jobs','📋 Vagas'],
    ['view-cand','🧑‍💼 Candidatos'],
    ['view-protocol','📋 Protocolo'],
    ['view-reports','📑 Relatórios'],
    ['view-audit','🗂️ Logs']
  ],
  [ROLES.GESTOR]: [
    ['view-dashboard','📊 Dashboard'],
    ['view-employees','👥 Colaboradores'],
    ['view-att','🕒 Presenças'],
    ['view-leaves','🏖️ Afastamentos'],
    ['view-reviews','📈 Avaliações'],
    ['view-protocol','📋 Protocolo'],
    ['view-reports','📑 Relatórios']
  ],
  [ROLES.COLAB]: [
    ['view-dashboard','📊 Dashboard'],
    ['view-att','🕒 Presenças'],
    ['view-leaves','🏖️ Afastamentos'],
    ['view-payroll','💸 Folha'],
    ['view-reviews','📈 Avaliações'],
    ['view-protocol','📋 Protocolo']
  ]
};

export const DOCUMENT_TYPES = {
  RG: 'RG',
  CPF: 'CPF',
  CARTEIRA_TRABALHO: 'CARTEIRA_TRABALHO',
  DIPLOMA: 'DIPLOMA',
  CERTIFICADO: 'CERTIFICADO',
  CONTRATO: 'CONTRATO',
  ATESTADO: 'ATESTADO',
  COMPROVANTE_RESIDENCIA: 'COMPROVANTE_RESIDENCIA',
  OUTRO: 'OUTRO'
};

export const EMPLOYEE_STATUS = {
  ATIVO: 'ATIVO',
  INATIVO: 'INATIVO',
  AFASTADO: 'AFASTADO'
};
