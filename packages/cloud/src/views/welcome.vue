<template>
  <div class="welcome-container">
    <!-- Header -->
    <header class="header">
      <div class=" bg-white">
        <div class=" h-100 ">
          <img :src="Toke" alt="logo"/>
        </div>
        <span class="logo">Toke</span>
      </div>
      <nav class="nav">
        <a href="#">ACCUEIL</a>
        <a href="#">FONCTIONNALITÉS</a>
        <a href="#">À PROPOS</a>
        <a href="#">CONTACT</a>
      </nav>
      <div class="burger">
        <span></span><span></span><span></span>
      </div>
    </header>

    <!-- Hero Section -->
    <main class="hero">
      <div class="hero-content">
        <div class="hero-icon pulse">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67V7z" fill="currentColor"/>
          </svg>
        </div>

        <h1 class="">Gestion de Présence</h1>
        <h2 class="">Intelligente & Moderne</h2>

        <p class="">
          Révolutionnez la gestion des présences de votre entreprise avec notre solution innovante.
          Pointage automatique via WiFi, géolocalisation GPS pour les sites multiples, et suivi en temps réel
          de tous vos collaborateurs. Simple, sécurisé et efficace.
        </p>

        <div class="features-grid fade-in-up delay-long">
          <div class="feature-card float-animation">
            <div class="feature-icon">📶</div>
            <h3>Pointage WiFi</h3>
            <p>Détection automatique via réseau WiFi de l'entreprise</p>
          </div>

          <div class="feature-card float-animation delay-1">
            <div class="feature-icon">📍</div>
            <h3>GPS Multi-sites</h3>
            <p>Géolocalisation précise pour plusieurs sites</p>
          </div>

          <div class="feature-card float-animation delay-2">
            <div class="feature-icon">📊</div>
            <h3>Suivi Temps Réel</h3>
            <p>Dashboard de suivi instantané des présences</p>
          </div>
        </div>

        <div class="cta-container">
          <router-link to="/auth" class="cta bounce">
            <span>COMMENCER MAINTENANT</span>
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M5 12h14m-7-7 7 7-7 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </router-link>
        </div>
      </div>
    </main>

    <!-- Animated Background Elements -->
    <div class="background-animations">
      <div class="floating-shape shape-1"></div>
      <div class="floating-shape shape-2"></div>
      <div class="floating-shape shape-3"></div>
      <div class="floating-shape shape-4"></div>
      <div class="floating-shape shape-5"></div>
    </div>

    <!-- Waves Animation -->
    <div class="waves">
      <div class="wave wave1"></div>
      <div class="wave wave2"></div>
      <div class="wave wave3"></div>
    </div>
  </div>
</template>

<script setup>
import '../assets/css/toke-welcome-03.css'
import Toke from '../../public/images/toke-white.svg'
// Animation d'entrée au chargement de la page
import { onMounted } from 'vue'

onMounted(() => {
  // Ajouter des animations supplémentaires si nécessaire
  console.log('Page de pointage chargée')
})
</script>