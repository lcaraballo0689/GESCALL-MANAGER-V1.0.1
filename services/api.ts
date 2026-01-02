class ApiService {
  private getApiUrl(): string {
    // Try to get from saved settings first
    try {
      const savedSettings = localStorage.getItem('systemSettings');
      if (savedSettings) {
        const settings = JSON.parse(savedSettings);
        if (settings.apiUrl) {
          return settings.apiUrl;
        }
      }
    } catch (error) {
      console.error('[API] Error loading settings:', error);
    }

    // Fallback to environment variable or default
    try {
      if (typeof window !== 'undefined' && (window as any).VITE_API_URL) {
        return (window as any).VITE_API_URL;
      }
    } catch { }

    return 'https://gescall.balenthi.com/api';
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const url = `${this.getApiUrl()}${endpoint}`;

    const defaultOptions: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
      },
      ...options,
    };

    try {
      const response = await fetch(url, defaultOptions);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Request failed');
      }

      return data;
    } catch (error) {
      console.error(`[API] Error ${options.method || 'GET'} ${endpoint}:`, error);
      throw error;
    }
  }

  // Lists
  async getLists() {
    // Note: This would need a backend endpoint to list all lists
    // For now, we'll use campaigns to get associated lists
    return this.request('/campaigns');
  }

  async getList(listId: string) {
    return this.request(`/lists/${listId}`);
  }

  async createList(listData: any) {
    return this.request('/lists', {
      method: 'POST',
      body: JSON.stringify(listData),
    });
  }

  async updateList(listId: string, updates: any) {
    return this.request(`/lists/${listId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteList(listId: string, deleteLeads = false) {
    return this.request(`/lists/${listId}?delete_leads=${deleteLeads}`, {
      method: 'DELETE',
    });
  }

  async getListLeads(listId: string, limit = 100, offset = 0) {
    return this.request(`/lists/${listId}/leads?limit=${limit}&offset=${offset}`);
  }

  async getNextListId() {
    return this.request('/lists/next-id');
  }

  // Leads
  async searchLeads(phoneNumber: string, records = 1000) {
    return this.request(`/leads/search?phone_number=${phoneNumber}&records=${records}`);
  }

  async getLead(leadId: string, customFields = false) {
    return this.request(`/leads/${leadId}?custom_fields=${customFields ? 'Y' : 'N'}`);
  }

  async createLead(leadData: any) {
    return this.request('/leads', {
      method: 'POST',
      body: JSON.stringify(leadData),
    });
  }

  async updateLead(leadId: string, updates: any) {
    return this.request(`/leads/${leadId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteLead(leadId: string) {
    return this.request(`/leads/${leadId}`, {
      method: 'DELETE',
    });
  }

  // Campaigns
  async getCampaigns(params: {
    campaignId?: string;
    allowedCampaigns?: string[];
  } = {}) {
    const { campaignId, allowedCampaigns } = params;
    const searchParams = new URLSearchParams();

    if (campaignId) {
      searchParams.append('campaign_id', campaignId);
    }

    if (allowedCampaigns && allowedCampaigns.length > 0) {
      searchParams.append('allowed_campaigns', allowedCampaigns.join(','));
    }

    const queryString = searchParams.toString();
    const url = queryString ? `/campaigns?${queryString}` : '/campaigns';

    return this.request(url);
  }

  async getCampaignHopper(campaignId: string) {
    return this.request(`/campaigns/${campaignId}/hopper`);
  }

  async getCampaignProgress(campaignId: string, limit = 1000) {
    return this.request(`/campaigns/${campaignId}/progress`, {
      method: 'POST',
      body: JSON.stringify({ limit }),
    });
  }

  async updateListStatus(listId: string, active: 'Y' | 'N'): Promise<{ success: boolean; message?: string }> {
    return this.request(`/lists/${listId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ active }),
    });
  }

  async getCampaignLists(campaignId: string) {
    return this.request(`/campaigns/${campaignId}/lists`);
  }

  async getCampaignDialLog(campaignId: string, startDatetime: string, endDatetime: string, limit = 500000) {
    return this.request(`/campaigns/${campaignId}/dial-log`, {
      method: 'POST',
      body: JSON.stringify({ startDatetime, endDatetime, limit }),
    });
  }

  async getCampaignCallerIdSettings(campaignId: string) {
    return this.request(`/campaigns/${campaignId}/callerid-settings`);
  }

  async updateCampaignCallerIdSettings(campaignId: string, data: {
    rotation_mode: string;
    pool_id?: number | null;
    match_mode?: string;
    fixed_area_code?: string | null;
    fallback_callerid?: string | null;
    selection_strategy?: string;
  }) {
    return this.request(`/campaigns/${campaignId}/callerid-settings`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async startCampaign(campaignId: string) {
    return this.request(`/campaigns/${campaignId}/start`, {
      method: 'POST',
    });
  }

  async stopCampaign(campaignId: string) {
    return this.request(`/campaigns/${campaignId}/stop`, {
      method: 'POST',
    });
  }

  async getCampaignsSummary(campaigns?: string[]) {
    return this.request('/campaigns/summary', {
      method: 'POST',
      body: JSON.stringify({ campaigns }),
    });
  }

  // Dashboard data endpoints (replacement for Vicibroker)
  async getBulkCampaignsStatus(campaigns?: string[]) {
    return this.request('/campaigns/bulk/status', {
      method: 'POST',
      body: JSON.stringify({ campaigns: campaigns || [] }),
    });
  }

  async getBulkListsCount(campaigns: string[]) {
    return this.request('/campaigns/bulk/lists-count', {
      method: 'POST',
      body: JSON.stringify({ campaigns }),
    });
  }

  // Agents
  async getLoggedInAgents(campaigns?: string, userGroups?: string) {
    const params = new URLSearchParams();
    if (campaigns) params.append('campaigns', campaigns);
    if (userGroups) params.append('user_groups', userGroups);

    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request(`/agents/logged-in${query}`);
  }

  async getAgentStatus(agentUser: string) {
    return this.request(`/agents/${agentUser}/status`);
  }

  // Health check
  async healthCheck() {
    // Health endpoint is on root, not /api
    const apiUrl = this.getApiUrl();
    const baseUrl = apiUrl.replace('/api', '');
    const response = await fetch(`${baseUrl}/health`);
    return response.json();
  }

  // Audio management
  async getAudioFiles() {
    return this.request('/audio');
  }

  async uploadAudio(file: File, campaign: string) {
    const formData = new FormData();
    formData.append('audio', file);
    formData.append('campaign', campaign);

    const apiUrl = this.getApiUrl();
    const response = await fetch(`${apiUrl}/audio/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error al subir archivo');
    }

    return response.json();
  }

  async deleteAudio(filename: string) {
    return this.request(`/audio/${encodeURIComponent(filename)}`, {
      method: 'DELETE',
    });
  }

  // Blacklist / DNC
  async getDncList(limit = 100, page = 1, search = '') {
    return this.request(`/dnc?limit=${limit}&page=${page}&search=${search}`);
  }

  async addDncNumber(phoneNumber: string) {
    return this.request('/dnc', {
      method: 'POST',
      body: JSON.stringify({ phoneNumber }),
    });
  }

  async removeDncNumber(phoneNumber: string) {
    return this.request(`/dnc/${phoneNumber}`, {
      method: 'DELETE',
    });
  }

  async clearAllDncNumbers() {
    return this.request('/dnc/all', {
      method: 'DELETE',
    });
  }

  async uploadDncFile(file: File) {
    const formData = new FormData();
    formData.append('file', file);

    const apiUrl = this.getApiUrl();
    const response = await fetch(`${apiUrl}/dnc/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error al subir archivo');
    }

    return response.json();
  }

  async getAudioInfo(filename: string) {
    return this.request(`/audio/${encodeURIComponent(filename)}/info`);
  }
  getAudioStreamUrl(filename: string): string {
    return `${this.getApiUrl()}/audio/${filename}/stream`;
  }

  // Whitelist / Prefix API
  async getWhitelistPrefixes(limit = 50, page = 1, search = '') {
    return this.request(`/whitelist?limit=${limit}&page=${page}&search=${search}`);
  }

  async addWhitelistPrefix(prefix: string, description?: string) {
    return this.request('/whitelist', {
      method: 'POST',
      body: JSON.stringify({ prefix, description }),
    });
  }

  async updateWhitelistPrefix(id: number, data: { prefix?: string; description?: string; is_active?: boolean }) {
    return this.request(`/whitelist/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteWhitelistPrefix(id: number) {
    return this.request(`/whitelist/${id}`, {
      method: 'DELETE',
    });
  }

  async validateWhitelistNumber(phoneNumber: string) {
    return this.request(`/whitelist/validate/${phoneNumber}`);
  }

  async applyWhitelistFilter() {
    return this.request('/whitelist/apply', { method: 'POST' });
  }

  async clearWhitelistFilter() {
    return this.request('/whitelist/clear-filter', { method: 'POST' });
  }

  // CallerID Pools API
  async getCallerIdPools(limit = 50, page = 1, search = '') {
    return this.request(`/callerid-pools?limit=${limit}&page=${page}&search=${search}`);
  }

  async getCallerIdPool(id: number) {
    return this.request(`/callerid-pools/${id}`);
  }

  async createCallerIdPool(name: string, description?: string, country_code?: string) {
    return this.request('/callerid-pools', {
      method: 'POST',
      body: JSON.stringify({ name, description, country_code }),
    });
  }

  async updateCallerIdPool(id: number, data: { name?: string; description?: string; country_code?: string; is_active?: boolean }) {
    return this.request(`/callerid-pools/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteCallerIdPool(id: number) {
    return this.request(`/callerid-pools/${id}`, {
      method: 'DELETE',
    });
  }

  async getPoolNumbers(poolId: number, limit = 100, page = 1, search = '') {
    return this.request(`/callerid-pools/${poolId}/numbers?limit=${limit}&page=${page}&search=${search}`);
  }

  async getPoolAreaCodes(poolId: number) {
    return this.request(`/callerid-pools/${poolId}/area-codes`);
  }

  async addPoolNumber(poolId: number, callerid: string) {
    return this.request(`/callerid-pools/${poolId}/numbers`, {
      method: 'POST',
      body: JSON.stringify({ callerid }),
    });
  }

  async importPoolNumbers(poolId: number, numbers: string) {
    return this.request(`/callerid-pools/${poolId}/import`, {
      method: 'POST',
      body: JSON.stringify({ numbers }),
    });
  }

  async uploadPoolNumbersFile(poolId: number, file: File) {
    const formData = new FormData();
    formData.append('file', file);

    const apiUrl = this.getApiUrl();
    const response = await fetch(`${apiUrl}/callerid-pools/${poolId}/import`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error al importar');
    }

    return response.json();
  }

  async deletePoolNumber(poolId: number, numberId: number) {
    return this.request(`/callerid-pools/${poolId}/numbers/${numberId}`, {
      method: 'DELETE',
    });
  }

  async togglePoolNumber(poolId: number, numberId: number, isActive: boolean) {
    return this.request(`/callerid-pools/${poolId}/numbers/${numberId}/toggle`, {
      method: 'PUT',
      body: JSON.stringify({ is_active: isActive }),
    });
  }

  async getPoolLogs(poolId: number, limit = 100, offset = 0) {
    return this.request(`/callerid-pools/${poolId}/logs?limit=${limit}&offset=${offset}`);
  }

  // Schedules
  async getSchedules() {
    return this.request('/schedules');
  }

  async getUpcomingSchedules(start?: string, end?: string) {
    const params = new URLSearchParams();
    if (start) params.append('start', start);
    if (end) params.append('end', end);
    return this.request(`/schedules/upcoming?${params.toString()}`);
  }

  async createSchedule(data: {
    schedule_type: 'list' | 'campaign';
    target_id: string;
    target_name?: string;
    action: 'activate' | 'deactivate';
    scheduled_at: string;
    end_at?: string | null;
    recurring?: 'none' | 'daily' | 'weekly' | 'monthly';
  }) {
    return this.request('/schedules', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateSchedule(id: number, data: {
    scheduled_at?: string;
    end_at?: string | null;
    action?: 'activate' | 'deactivate';
    recurring?: 'none' | 'daily' | 'weekly' | 'monthly';
  }) {
    return this.request(`/schedules/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteSchedule(id: number) {
    return this.request(`/schedules/${id}`, {
      method: 'DELETE',
    });
  }

  async getScheduleTargetCampaigns() {
    return this.request('/schedules/targets/campaigns');
  }

  async getScheduleTargetLists() {
    return this.request('/schedules/targets/lists');
  }
}

export default new ApiService();
