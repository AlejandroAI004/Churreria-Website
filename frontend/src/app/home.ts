import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { STORE } from './store.config';
@Component({
  selector: 'app-home',
  imports: [RouterLink],
  template: `
    <section class="hero">
      <div class="hero-copy">
        <p class="eyebrow"><span class="little-star">✳</span> TU CHURRERÍA DE BARRIO</p>
        <h1>Las cosas buenas<br />se hacen <em>sin prisa.</em></h1>
        <p class="hero-description">{{ store.description }}</p>
        <a routerLink="/productos" class="button"
          >Descubre nuestro menú <span aria-hidden="true">↗</span></a
        >
        <div class="hero-note">
          <span aria-hidden="true">♡</span> Recién hechos. Como deben ser.
        </div>
      </div>
      <div class="hero-visual">
        <div class="hero-seal">MASA SENCILLA<br /><span>100%</span><br />HECHOS A MANO</div>
        <img
          src="/art/hero.svg"
          alt="Ilustración de churros dorados sobre un plato, junto a una taza de chocolate"
          width="680"
          height="620"
          fetchpriority="high"
        />
        <span class="handwritten">Un poquito de felicidad.</span>
      </div>
    </section>
    <div class="promise-strip">
      <span>✳ &nbsp; Receta de siempre</span><span>✳ &nbsp; Hechos al momento</span
      ><span>✳ &nbsp; Mejor en compañía</span>
    </div>
    <section class="section">
      <div class="section-heading">
        <div>
          <p class="eyebrow">¿QUÉ TE APETECE HOY?</p>
          <h2>A cada antojo, su churro.</h2>
        </div>
        <a routerLink="/productos" class="text-link"
          >Ver todo el menú <span aria-hidden="true">→</span></a
        >
      </div>
      <div class="category-grid">
        <a routerLink="/productos" [queryParams]="{ categoria: 'clasicos' }" class="category-card"
          ><img src="/art/clasicos.svg" alt="" width="480" height="340" />
          <div>
            <h3>Los de siempre</h3>
            <p>Crujientes, dorados, irresistibles.</p>
            <span aria-hidden="true">↗</span>
          </div></a
        >
        <a routerLink="/productos" [queryParams]="{ categoria: 'rellenos' }" class="category-card"
          ><img src="/art/rellenos.svg" alt="" width="480" height="340" />
          <div>
            <h3>Con mucho corazón</h3>
            <p>Un dulce secreto en cada bocado.</p>
            <span aria-hidden="true">↗</span>
          </div></a
        >
        <a routerLink="/productos" [queryParams]="{ categoria: 'bebidas' }" class="category-card"
          ><img src="/art/bebida.svg" alt="" width="480" height="340" />
          <div>
            <h3>La pareja perfecta</h3>
            <p>Algo calentito para acompañar.</p>
            <span aria-hidden="true">↗</span>
          </div></a
        >
      </div>
    </section>
    <section class="visit-section">
      <div class="visit-title">
        <p class="eyebrow">NOS VEMOS EN EL BARRIO</p>
        <h2>Siempre hay un<br />huequito para ti.</h2>
        <p>{{ store.tagline }}</p>
      </div>
      <div class="visit-info">
        <span class="eyebrow">DÓNDE ESTAMOS</span>
        <p>{{ store.address }}</p>
        <span class="eyebrow">CUÁNDO NOS ENCUENTRAS</span>
        <p>{{ store.hours }}<br />{{ store.weekendHours }}</p>
        <small>Dirección y horarios de ejemplo.</small>
      </div>
    </section>
  `,
})
export class Home {
  store = STORE;
}
