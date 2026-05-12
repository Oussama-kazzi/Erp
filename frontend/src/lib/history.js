import { supabase } from './supabase';

export const logHistory = async ({ action, module, description, referenceId, metadata }) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('history').insert({
      action,
      module,
      description,
      user_name: user?.user_metadata?.name || user?.email || 'System',
      reference_id: referenceId || null,
      metadata: metadata || null,
    });
  } catch { /* silent — history failure should not break UI */ }
};
