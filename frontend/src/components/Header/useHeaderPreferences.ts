import { useEffect, useMemo, useState } from 'react';

import { api } from '../../utils/apiClient';

interface HeaderSettings {
    websiteName?: string;
    infiniteScroll?: boolean;
    showThemeButton?: boolean;
}

interface HeaderPreferences {
    websiteName: string;
    infiniteScroll: boolean;
    showThemeButton: boolean;
}

export const useHeaderPreferences = (
    isAuthenticated: boolean,
    settingsData?: HeaderSettings
): HeaderPreferences => {
    const [websiteNameState, setWebsiteNameState] = useState('AI Tube');
    const [infiniteScrollState, setInfiniteScrollState] = useState(false);
    const [showThemeButtonState, setShowThemeButtonState] = useState(true);

    useEffect(() => {
        if (isAuthenticated) {
            return;
        }

        const fetchSettings = async () => {
            try {
                const response = await api.get('/settings');
                const data = response.data;
                if (!data) {
                    return;
                }
                if (data.websiteName) {
                    setWebsiteNameState(data.websiteName);
                }
                if (typeof data.infiniteScroll !== 'undefined') {
                    setInfiniteScrollState(Boolean(data.infiniteScroll));
                }
                if (typeof data.showThemeButton !== 'undefined') {
                    setShowThemeButtonState(Boolean(data.showThemeButton));
                }
            } catch (error) {
                console.error('Failed to fetch settings for header:', error);
            }
        };

        fetchSettings();
    }, [isAuthenticated]);

    return useMemo(() => {
        if (isAuthenticated && settingsData) {
            return {
                websiteName: settingsData.websiteName?.trim() || 'AI Tube',
                infiniteScroll: settingsData.infiniteScroll ?? false,
                showThemeButton: settingsData.showThemeButton !== false
            };
        }

        return {
            websiteName: websiteNameState?.trim() || 'AI Tube',
            infiniteScroll: infiniteScrollState,
            showThemeButton: showThemeButtonState
        };
    }, [isAuthenticated, settingsData, websiteNameState, infiniteScrollState, showThemeButtonState]);
};
