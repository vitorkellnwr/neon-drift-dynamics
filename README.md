# Remix of Remix of Remix of Neon Drift Dynamics

Crie uma aplicação web interativa em 3D de um jogo de carro em Three.js (ou React Three Fiber) com estilo visual escuro/neon (estilo Need for Speed). 

### 1. TELA INICIAL / MENU PRINCIPAL (OVERLAY):

- Layout em tela cheia com fundo transparente sobre o canvas 3D.

- TOPO DA TELA:

  - Título em destaque: "🏎️ DRIFT SIMULATOR 3D" com gradiente azul/neon.

  - Indicador de status do Arduino + botão "🔌 Conectar" no canto superior direito (usando Web Serial API).

- MEIO DA TELA:

  - Deixe a metade superior livre para exibir o carro em 3D no centro da tela. 

  - A câmera deve ficar posicionada em um ângulo levemente elevado e inclinada para baixo, garantindo que o carro apareça 100% visível ACIMA dos painéis do menu (sem ficar escondido).

  - Permita que o usuário clique e arraste com o mouse na área superior para girar o modelo do carro em 360°.

- PARTE INFERIOR (PAINEL DE CARDS):

  - Card 1: "🏎️ Seu Carro" -> Dropdown para selecionar o carro + Botão para upload de múltiplos arquivos .glb/.gltf (salvar no LocalStorage).

  - Card 2: "🗺️ Mapa / Pista" -> Botão para fazer upload do modelo 3D do mapa (.glb/.gltf) + Botão de "Tela Cheia".

  - Botão Principal (Abaixo dos cards, ocupando largura total): "▶️ INICIAR CORRIDA" em verde brilhante/neon.

### 2. MECÂNICA DE SPAWN E PISTA (3D):

- Quando um mapa .glb for carregado, detecte automaticamente a malha (mesh) com colisão.

- Assim que clicar em "INICIAR CORRIDA", use Raycasting vertical (de cima para baixo) para encontrar a pista e posicionar o carro EXATAMENTE sobre o solo onde há colisão, sem que o carro caia no vazio ou nasça longe do mapa.

- Remova o menu inicial e mostre a HUD do jogo.

### 3. HUD DO JOGO (DURANTE A CORRIDA):

- Canto superior direito: Botão "⚙️ Menu Inicial (ESC)" para pausar e retornar ao menu.

- Canto inferior direito: Velocímetro estilizado mostrando a velocidade atual em KM/H.

### 4. CONTROLES E SUPORTE A ARDUINO:

- Permita controlar o carro com teclado (W/S/A/D ou Setas + Espaço para Freio de Mão / Drift).

- Integre a Web Serial API no botão "Conectar Arduino" para ler 5 entradas digitais (pino 8 = acelerar, pino 9 = ré, pino 10 = esquerda, pino 11 = direita, pino 12 = freio/drift).

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/309a45e9-d6c4-456c-bd9e-0ee31ab112bc).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
