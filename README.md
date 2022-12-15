# projet de réseaux

## Input

must take in input a hex dup + offset and interpretation of the packets. (see `src/data/txt/` for examples)

to convert a pcap file use : `tshark -Q -x -r <.pcap> > <out.txtcap>` (or use wireshark gui)
and remove the rassembled tcp part of the output

## Utilisation

La version web app du projet se trouve dans le lien suivant : https://frames.rboud.com/

Vous avez juste à renseigner le fichier nécessaire et ensuite le site fera le reste.

## Installation & Build

Avant d'installer, sachez que les dernières version update to date du build se trouve dans la [branch gh-pages](https://github.com/rboudrouss/request_parser/tree/gh-pages).

Pour installer on aura besoin de l'interpréteur javacript `node.js` à installer ici: https://nodejs.org/en/ (ou avec pour packet manager).

Pour build le projet, il faut installer les nodes modules avec `npm i`, puis build le projet avec `npm run build`. Il vous suffira d'ouvrir le fichier `index.html` dans le dossier build dans n'importe quel navigateur.

## CLI

Le projet a aussi une version CLI complète avec lequel se base tout le projet, vous pouvez accéder au code dans la [branch main](https://github.com/rboudrouss/request_parser/tree/main)
