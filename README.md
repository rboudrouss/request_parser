TODO add a release flag with projet already built

TODO test icmp & ipv6 x')

# projet de réseaux

## Boudrouss Réda 28712638

## Zhenyao lin 28708274

## Input

must take in input a hex dup + offset and interpretation of the packets. (see `src/data/txt/` for examples)

to convert a pcap file use : `tshark -Q -x -r <.pcap> > <out.txtcap>` (or use wireshark gui)
and remove the rassembled tcp part of the output

## Installation

_Nous avons fait le choix de n'utiliser aucune dépendance pour le projet hormis les dépendances nécessaires, tel que l'interpréteur et le typages._

Pour excecuter notre code vous avez 2 choix :

Mais dans les 2 cas, on aura besoin de l'interpréteur javacript `node.js` à installer ici: https://nodejs.org/en/ (ou avec pour packet manager)

### Méthode facile

Récupérer la dernière version dans l'onglet release sur github (Pour le correcteur c'est déjà forni dans le dossier `build/`).

Et exceuter avec la commande suivante `node cli.js`. Toute les commandes et filtres cité en dessous marchent très bien en remplaçant `<npx> ts-node cli.ts` par `node cli.js`

### interpréter directement le code source

Installer les modules avec `npm i` (pas besoin de fix les vulnérabilités).

Vous pouvez donc utiliser `<npx> ts-node cli.ts` pour executer directement le code. `npx` est optionnel mais peut servir dans le cas où `ts-node` n'est pas dans le PATH.

## Utilisation

Entrez dans le dossier `/src/` (ou `build/` si vous executer la version javascript avec nodejs)

La syntaxe ressemble à ce qui suit `node cli.js <a/f> <input file> [-F <options>] [-o <output file>] [-h]`.

l'option `A` c'est pour l'analyse et `F` c'est pour le monde affichage avec FLECHE.

Le `-h` avec le mode `A` permet d'avoir une version plus lisible (_humaine_) de la description de la frame

## Les filtres

Les options de filtres que vous avez sont :

- `arp`: sélectionne seulement les requêtes ARP

- `ipv4` : sélectionne seulement les requêtes qui utilisent IPV4

- `ipv6` : sélectionne seulement les requêtes qui utilisent IPV6

- `tcp` : sélectionne seulement les requêtes qui utilisent le protocole TCP

- `http` : sélectionne seulement les requêtes http

- `index=<n°> :` : sélectionne la (`<n°>`-1)ème requête par trie chronologique. (utile pour voir une requête en particulier en analyse)

- `max_index=<n°> :` : sélectionne les requêtes avec un index inférieur à `<n°>` (`<n°>` inclus)

- `min_index=<n°> :` : sélectionne les requêtes avec un index supérieur à `<n°>` (`<n°>` inclus)

- `source_ip=<ip>` sélectionne seulement les requêtes émis par l'ip `<ip>`

- `dest_ip=<ip>` sélectionne seulement les paquets destinés à l'ip `<ip>`

- `ip=<ip>` sélectionne seulement les paquets émis ou à destination de l'ip `<ip>`

- `source_mac=<mac>` sélectionne seulement les paquets émis par l'adresse `<mac>`

- `dest_mac=<mac>` sélectionne seulement les paquets destinés à l'adresse `<mac>`

- `mac=<mac>` sélectionne seulement les paquets émis ou à destination de l'adresse `<mac>`

- `source_port=<port>` sélectionne seulement les paquets émis par du port `<port>`

- `dest_port=<port>` sélectionne seulement les paquets destiné au port `<port>`

- `port=<port>` sélectionne seulement les paquets émis ou à destination du port`<port>`

- `NS`/`CWR`/`ECE`/`URG`/`ACK`/`PSH`/`RST`/`SYN`/`FIN` : sélectionne seulement les paquets avec les flags tcp choisi

Examples :

- `node cli.js f data/txt/http2.txtcap -F tcp source_ip=145.254.160.237 port=80 -o test.txt`

Cette commande lit le ficher `http2.txtcap` et affiche en mode flèches les requêtes utilisant tcp, avec comme ip source `145.254.160.237`, emis ou à destination du port `80` et l'écris dans le fichier `test.txt`.

- `node cli.js a data/txt/http2.txtcap -F index=29 -o data/http2.json`

Cette commande lit le fichier `http2.txtcap` et affiche le _json_ qui contient toutes les informations nécessaires de la trame n°29 et l'écrit dans le fichier `http2.json`

Il y a des fichiers d'exemple à excecuter dans le dossier `src/data/txt`

## Building (optional)

ts-node transpile sur le moment le code en javascript ce qui peut s'avérer lent surtout sur des petites machines. Il est possible de _build_ le projet en JS pour l'excuter plus rapidement.

Pour se faire dans le root du projet taper `npm run build`. ça va transpiler le code, et une fois cela fait il suffit d'excécuter avec node le fichier `build/cli.js` sous la forme `node cli.js`.

Si vous avez une erreur pendant le build c'est que vous avez peut-être pas installé les nodes_modules avec `npm i`

## Description du code

Pour exécuter le code, il suffit d'executer le fichier `cli.ts` avec `ts-node` (ou si vous utilisez la version buildé c'est `cli.js` avec `node`). C'est dans ce fichier aussi qu'est déclaré la fonction principale qui permet l'interface de commande

Le code se découpe en 2 grands dossiers principaux, dans le dossier `parser` regroupant tout le code des parser combinators qui sont utilisés :

#### Pour le dossier `parser`:

- `Pstate.ts` contient "l'état" d'un parseur qui contient l'index au bit près d'où il doit commencer à parser, un booléen et un message d'erreur en cas d'erreur, le resultat du parsing et finalement se que Javascript appel un dataView.

Dans un soucis d'uniformisation et de praticité, les données en entrée sont transfromé en un seul flow de bit binaire, nous ne savons pas en avance par où commence une frame et par où elle se termine, notre parseur lit les données comme si c'était un seul flot de chaine binaire.

- `parser.ts` contient la class d'un parseur, elle regroupe toutes les fonctions utiles et méthode d'un parseur. Un parseur pour faire simple est une fonction qui prend en paramètre un état de parseur et en retoune un nouveau.

- `pGen.ts` contient ce que l'on appelle des parseurs élémentaires ou des générateurs de parseur. Le fichier `pBin.ts` contient quand à lui des parseurs qui sont sensible à la lecture au bit près, contrairement au parseur dans `pGen.ts` qui lisent par blocs d'octets.

- `pComb.ts` contient ce que l'on appelle des parsers combinators. Ce qui est pour faire simple des fonctions qui prennent en paramètre plusieurs parsers et en retourne un nouveau.

- `utils.ts` quand à lui regroupe juste les constantes et fonctions utilisé plusieurs fois durant le code.

#### pour le dossier `headerP`

- `basicP.ts` contient les parseurs simples qui sont utilisé un peu partout, tel que le parseur pour une adresse mac ou celle d'une adresse ip

- `ethernetP.ts` contient le parseur pour le protocol http, on y vois juste décrie les différents éléments consituant le header, c'est un parser assez simple.

- `ipP.ts` contient les parseurs pour les protocols du layes internet supporté, c'est à dire, ipv4, ipv6, ICMP(4), ARP.

- `tcpP.ts` contient le parseur pour le protocole tcp.

- `httpP.ts` contient la fonction qui décrit un protocole http, c'est pas vraiment un parseur à proprement parler

- `index.ts` contient le parser principale `header_parser`, ce parser est capable de parser _exactement **une** frame_ et de différencier les différents protocole et de choisir celui qui correspond. Pour parser plusieurs frames, il faut le coupler au parser combinator `many`

- `utils.ts` contient aussi des fonctions et constantes assez utilisé partout, mais contient aussi et surtout la fonction `filter` qui permet le filtrage selon les filtres données en paramètres.

## Web app version

Le projet a aussi une version web app pas fini (WIP), vous pouvez regarder le code dans la [branch web_app](https://github.com/rboudrouss/request_parser/tree/webapp)
