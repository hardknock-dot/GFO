export interface ScheduleCommentNotification {
  id: string;
  engineerName: string;
  scheduleId?: string;
  supportType?: string;
  fabSite?: string;
  remarks: string;
  timestamp: string;
}

export const notifyScheduleCommentAdded = (data: {
  engineerName: string;
  scheduleId?: string;
  supportType?: string;
  fabSite?: string;
  remarks: string;
}) => {
  const payload: ScheduleCommentNotification = {
    id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    engineerName: data.engineerName,
    scheduleId: data.scheduleId,
    supportType: data.supportType,
    fabSite: data.fabSite,
    remarks: data.remarks,
    timestamp: new Date().toISOString(),
  };

  try {
    localStorage.setItem('ormp_schedule_comment_notif', JSON.stringify(payload));
  } catch (e) {
    console.warn('LocalStorage notification write error:', e);
  }

  window.dispatchEvent(new CustomEvent('ormp_schedule_comment_added', { detail: payload }));
};
