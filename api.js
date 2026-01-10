/**
 * Simple wrapper for Websim Comment & Project APIs
 */

export const Api = {
    async getProjectData() {
        const project = await window.websim.getCurrentProject();
        const user = await window.websim.getCurrentUser();
        const creator = await window.websim.getCreator();
        return { project, user, creator };
    },

    async fetchComments({ sortBy = null, onlyTips = false, cursor = null } = {}) {
        const project = await window.websim.getCurrentProject();
        const params = new URLSearchParams();
        if (sortBy) params.append('sort_by', sortBy);
        if (onlyTips) params.append('only_tips', 'true');
        if (cursor) params.append('after', cursor);

        const url = `/api/v1/projects/${project.id}/comments?${params.toString()}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to fetch comments');
        const data = await response.json();
        return data.comments;
    },

    async postComment(content, credits = 0) {
        // This triggers the native UI pre-filled with our content
        return window.websim.postComment({
            content,
            credits
        });
    },

    onCommentCreated(callback) {
        window.websim.addEventListener('comment:created', callback);
    }
};