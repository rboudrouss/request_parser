TODO add a release flag with projet already built

TODO make a more readable way than json

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


Mais dans les 2 cas, on aura besoin de l'interpréteur javacript `node.js` à installer ici:  https://nodejs.org/en/ (ou avec pour packet manager)


### Méthode facile

Récupérer la dernière version dans l'onglet release sur github (Pour le correcteur c'est déjà forni dans le dossier `build/`).

Et excecuter avec la commande suivante `node cli.js`. Toute les commandes et filtres cité en dessous marchent très bien en remplaçant `<npx> ts-node cli.ts` par `node cli.js`

### interpréter directement le code source

Installer les modules avec `npm i` (pas besoin de fix les vulnérabilités)

ensuite pour executer le code, entrez dans le dossier `/src/` et executer la commande suivantes avec la syntaxe suivante `<npx> ts-node cli.ts <a/f> <input file> [-F <options>] [-o <output file>]`.

`npx` est optionnel mais peut servir dans le cas où `ts-node` n'est pas dans le PATH. l'option `A` c'est pour l'analyse et `F` c'est pour le monde affichage avec FLECHE. 

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

Pour se faire dans le root du projet taper `npm run build`. ça va transpiler le code, et une fois cela fait il suffit d'excécuter avec node le fichier `build/cli.js` sous la forme  `node cli.js`.

Si vous avez une erreur pendant le build c'est que vous avez peut-être pas installé les nodes_modules avec `npm i`

## Web app version

Le projet a aussi une version web app pas fini (WIP), vous pouvez regarder le code dans la [branch web_app](https://github.com/rboudrouss/request_parser/tree/webapp)
