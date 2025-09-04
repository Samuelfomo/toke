<template>
  <div class="welcome-container">
    <!-- Header -->
    <header class="header">
      <div class="logo">LOGO HERE</div>
      <nav class="nav">
        <a href="#">HOME</a>
        <a href="#">SERVICES</a>
        <a href="#">ABOUT</a>
        <a href="#">CONTACT</a>
      </nav>
      <div class="burger">
        <span></span><span></span><span></span>
      </div>
    </header>

    <!-- Hero Section -->
    <main class="hero">
      <h1 class="fade-in-down">Welcome</h1>
      <h2 class="fade-in-up">To Our Company</h2>
      <p class="fade-in-up delay">
        Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum
        has been the industry's standard dummy text ever since the 1500s, when an unknown printer
        took a galley of type and scrambled it to make a type specimen book.
      </p>
      <button class="cta bounce">LEARN MORE</button>
    </main>

    <!-- Animated Waves Background -->
    <div class="waves">
      <div class="wave wave1"></div>
      <div class="wave wave2"></div>
      <div class="wave wave3"></div>
    </div>
  </div>
</template>

<script setup>
import '../assets/css/toke-welcome-03.css'
// Pas besoin de logique JS pour cette landing page
</script>

<!--<style src="."></style>-->
