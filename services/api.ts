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
  async getCampaigns(campaignId?: string) {
    const query = campaignId ? `?campaign_id=${campaignId}` : '';
    return this.request(`/campaigns${query}`);
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

  async getCampaignLists(campaignId: string) {
    return this.request(`/campaigns/${campaignId}/lists`);
  }

  async getCampaignDialLog(campaignId: string, startDatetime: string, endDatetime: string, limit = 500000) {
    return this.request(`/campaigns/${campaignId}/dial-log`, {
      method: 'POST',
      body: JSON.stringify({ startDatetime, endDatetime, limit }),
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

  async getAudioInfo(filename: string) {
    return this.request(`/audio/${encodeURIComponent(filename)}/info`);
  }
  getAudioStreamUrl(filename: string): string {
    return `${this.getApiUrl()}/audio/${filename}/stream`;
  }
}

export default new ApiService();
