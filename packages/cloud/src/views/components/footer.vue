<template>
  <footer class="footer">
    <div class="footer-container">
      <!-- Footer Grid -->
      <div class="footer-grid">
        <!-- Logo & Tagline -->
        <div class="footer-brand">
          <router-link to="/" class="brand-link">
            <img src="../../../public/images/toke-main-logo.svg" alt="Toké" class="brand-logo" />
          </router-link>
          <p class="brand-tagline">
            Simplifiez la gestion de présence de votre équipe
          </p>
          <div class="social-links">
            <a
                href="https://wa.me/237671953999"
                target="_blank"
                rel="noopener noreferrer"
                class="social-link"
                aria-label="WhatsApp"
            >
              <svg class="social-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </a>
            <a
                href="https://linkedin.com/company/toke"
                target="_blank"
                rel="noopener noreferrer"
                class="social-link"
                aria-label="LinkedIn"
            >
              <svg class="social-icon" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
              </svg>
            </a>
            <a
                href="https://youtube.com/@toke"
                target="_blank"
                rel="noopener noreferrer"
                class="social-link"
                aria-label="YouTube"
            >
              <svg class="social-icon" fill="currentColor" viewBox="0 0 24 24">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
              </svg>
            </a>
          </div>
        </div>
      </div>

      <!-- Bottom Bar -->
      <div class="footer-bottom">
        <p class="copyright">© 2025 Toké. All rights reserved.</p>
        <div class="legal-links">
          <a href="https://toke.cm/legal/privacy" target="_blank" rel="noopener noreferrer" class="legal-link">
            Confidentialité
          </a>
          <a href="https://toke.cm/legal/terms" target="_blank" rel="noopener noreferrer" class="legal-link">
            Conditions d'utilisation
          </a>
        </div>
      </div>
    </div>
  </footer>
</template>

<script setup lang="ts">
import "../../assets/css/toke-footer-24.css"
</script>

<style scoped>
</style>