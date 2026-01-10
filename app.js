import { Api } from './api.js';
import { UI } from './ui.js';

class App {
    constructor() {
        this.currentTab = 'all';
        this.nextCursor = null;
        this.isLoading = false;
        
        this.els = {
            title: document.getElementById('project-title'),
            owner: document.getElementById('owner-username'),
            userAvatar: document.getElementById('user-avatar'),
            userName: document.getElementById('user-name'),
            feed: document.getElementById('comments-container'),
            loading: document.getElementById('loading-spinner'),
            loadMore: document.getElementById('load-more'),
            tabs: document.querySelectorAll('.tab-btn'),
            btnComment: document.getElementById('btn-comment'),
            btnTip: document.getElementById('btn-tip')
        };

        this.init();
    }

    async init() {
        try {
            const { project, user, creator } = await Api.getProjectData();
            
            // UI Setup
            this.els.title.innerText = project.title;
            this.els.owner.innerText = creator.username;
            
            if (user) {
                this.els.userAvatar.src = user.avatar_url;
                this.els.userAvatar.classList.remove('hidden');
                this.els.userName.innerText = user.username;
            }

            // Events
            this.els.tabs.forEach(btn => {
                btn.addEventListener('click', () => this.switchTab(btn.dataset.tab));
            });

            this.els.loadMore.addEventListener('click', () => this.loadComments(true));
            
            this.els.btnComment.addEventListener('click', () => {
                Api.postComment("I'm checking out the API showcase!");
            });

            this.els.btnTip.addEventListener('click', () => {
                Api.postComment("Support for this awesome project!", 100);
            });

            // Listen for new comments in real-time
            Api.onCommentCreated((data) => {
                const comment = data.comment;
                UI.showToast(`New comment from ${comment.author.username}!`);
                
                // If we are on the "Latest" tab, prepending it
                if (this.currentTab === 'all' && !comment.parent_comment_id) {
                    const card = UI.renderComment(comment);
                    this.els.feed.prepend(card);
                }
            });

            // Initial Load
            await this.loadComments();

        } catch (err) {
            console.error("Initialization failed", err);
        }
    }

    async switchTab(tab) {
        if (this.currentTab === tab) return;
        
        this.currentTab = tab;
        this.nextCursor = null;
        
        // Update UI state
        this.els.tabs.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tab);
        });

        this.els.feed.innerHTML = '';
        await this.loadComments();
    }

    async loadComments(isMore = false) {
        if (this.isLoading) return;
        this.isLoading = true;

        if (!isMore) {
            this.els.loading.classList.remove('hidden');
            this.els.loadMore.classList.add('hidden');
        }

        try {
            const options = {
                cursor: this.nextCursor,
                sortBy: this.currentTab === 'best' ? 'best' : null,
                onlyTips: this.currentTab === 'tips'
            };

            const result = await Api.fetchComments(options);
            
            this.els.loading.classList.add('hidden');
            
            if (result.data.length === 0 && !isMore) {
                this.els.feed.innerHTML = '<div style="text-align:center; padding: 2rem; color: var(--text-muted)">No comments yet. Be the first!</div>';
            } else {
                result.data.forEach(item => {
                    const card = UI.renderComment(item.comment);
                    this.els.feed.appendChild(card);
                });
            }

            this.nextCursor = result.meta.has_next_page ? result.meta.end_cursor : null;
            this.els.loadMore.classList.toggle('hidden', !this.nextCursor);

        } catch (err) {
            console.error("Load failed", err);
            this.els.loading.innerText = "Error loading comments.";
        } finally {
            this.isLoading = false;
        }
    }
}

new App();