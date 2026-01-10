import { Api } from './api.js';
import { UI } from './ui.js';

const TIERS = [
    { threshold: 5, name: "Bronze Supporter", reward: "Bronze Badge Icon", icon: "🥉" },
    { threshold: 25, name: "Silver Supporter", reward: "Silver Badge Icon", icon: "🥈" },
    { threshold: 50, name: "Gold Supporter", reward: "Gold Badge Icon", icon: "🥇" },
    { threshold: 100, name: "Platinum Supporter", reward: "Platinum Name Highlight", icon: "💎" },
    { threshold: 150, name: "Diamond Supporter", reward: "Diamond Avatar Glow", icon: "✨" },
    { threshold: 250, name: "Elite Supporter", reward: "Custom Comment Border", icon: "⚔️" },
    { threshold: 500, name: "Legendary Donor", reward: "Legendary Title", icon: "🔥" },
    { threshold: 1000, name: "Mythic Patron", reward: "Golden Profile Theme", icon: "🔱" },
    { threshold: 2500, name: "Immortal Benefactor", reward: "Immortal VIP Status", icon: "👑" }
];

class App {
    constructor() {
        this.currentTab = 'all';
        this.nextCursor = null;
        this.isLoading = false;
        this.userTotalTipped = 0;
        
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
            btnTip: document.getElementById('btn-tip'),
            btnCopyInfo: document.getElementById('btn-copy-info'),
            btnRewards: document.getElementById('btn-rewards'),
            modal: document.getElementById('modal-overlay'),
            closeModal: document.getElementById('close-modal'),
            tierList: document.getElementById('tier-list')
        };

        this.init();
    }

    async init() {
        try {
            const { project, user, creator } = await Api.getProjectData();
            this.currentUser = user;
            
            // Calculate initial tips for current user
            if (user) {
                await this.calculateUserTotalTipped(user.id);
            }
            
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
                this.openRewardsModal();
            });

            this.els.btnRewards.addEventListener('click', () => {
                this.openRewardsModal();
            });

            this.els.closeModal.addEventListener('click', () => {
                this.els.modal.classList.add('hidden');
            });

            this.els.modal.addEventListener('click', (e) => {
                if (e.target === this.els.modal) this.els.modal.classList.add('hidden');
            });

            this.els.btnCopyInfo.addEventListener('click', () => this.copyTechnicalOverview());

            // Listen for new comments in real-time
            Api.onCommentCreated((data) => {
                const comment = data.comment;
                UI.showToast(`New comment from ${comment.author.username}!`);
                
                // Update local total if current user tipped
                if (this.currentUser && comment.author.id === this.currentUser.id) {
                    const tip = comment.card_data?.credits_spent || 0;
                    if (tip > 0) {
                        this.userTotalTipped += tip;
                        UI.showToast(`Total supported: ${this.userTotalTipped} gold!`);
                    }
                }

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

    async calculateUserTotalTipped(userId) {
        try {
            // We fetch tip comments to sum them up for this user
            // In a real app we'd have a backend total, here we poll tips
            const tips = await Api.fetchComments({ onlyTips: true });
            let total = 0;
            tips.data.forEach(item => {
                if (item.comment.author.id === userId) {
                    total += (item.comment.card_data?.credits_spent || 0);
                }
            });
            this.userTotalTipped = total;
        } catch (err) {
            console.error("Failed to calculate tips", err);
        }
    }

    openRewardsModal() {
        this.renderTiers();
        this.els.modal.classList.remove('hidden');
    }

    renderTiers() {
        this.els.tierList.innerHTML = '';
        TIERS.forEach(tier => {
            const isUnlocked = this.userTotalTipped >= tier.threshold;
            const card = document.createElement('div');
            card.className = `tier-card ${isUnlocked ? 'unlocked' : 'locked'}`;
            
            card.innerHTML = `
                <div class="tier-info">
                    <div class="tier-name">${tier.icon} ${tier.name}</div>
                    <div class="tier-reward">${tier.reward}</div>
                </div>
                <button class="tier-cost" ${isUnlocked ? 'disabled' : ''}>
                    ${isUnlocked ? 'Unlocked' : tier.threshold + ' gold'}
                </button>
            `;

            if (!isUnlocked) {
                card.querySelector('.tier-cost').addEventListener('click', () => {
                    Api.postComment(`Supporting at the ${tier.name} level!`, tier.threshold);
                    this.els.modal.classList.add('hidden');
                });
            }

            this.els.tierList.appendChild(card);
        });
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

    copyTechnicalOverview() {
        const overview = `Websim API Showcase: Comments & Tips
This project demonstrates the integration of the Websim Comments API.

Key Implementation Details:
1. User & Project Context:
   - Uses window.websim.getCurrentProject(), getCurrentUser(), and getCreator() to establish identity and scope.
   
2. Dynamic Comment Loading:
   - Fetches from /api/v1/projects/{id}/comments.
   - Handles pagination via cursor-based 'after' parameters.
   - Implements sorting ('sort_by=best') and specific filtering ('only_tips=true') via tabbed navigation.

3. Interactive Posting & Tipping:
   - Leverages window.websim.postComment() for creating standard replies and pre-filled Tip Comments.
   - Tip Comments are identified via 'card_data.type === "tip_comment"' and 'card_data.credits_spent'.

4. Real-time Synchronization:
   - Listens for the 'comment:created' event to instantly inject new community activity into the UI without polling.

5. Rich Content Rendering:
   - Content is stored as Markdown.
   - Renders HTML safely using 'marked' for parsing and 'DOMPurify' for sanitization.
   - Automatically handles image attachments within the comment stream.

6. UX Features:
   - Mobile-first responsive design with blurred glass effects.
   - Toast notifications for new events.
   - Modular architecture splitting API, UI, and Application logic.`;

        navigator.clipboard.writeText(overview).then(() => {
            UI.showToast("Technical overview copied to clipboard!");
        }).catch(err => {
            console.error('Failed to copy: ', err);
            UI.showToast("Copy failed. See console.");
        });
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