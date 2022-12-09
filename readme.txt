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

- `index.ts` contient le parser principale `header_parser`, ce parser est capable de parser *exactement **une** frame* et de différencier les différents protocole et de choisir celui qui correspond. Pour parser plusieurs frames, il faut le coupler au parser combinator `many`

- `utils.ts` contient aussi des fonctions et constantes assez utilisé partout, mais contient aussi et surtout la fonction `filter` qui permet le filtrage selon les filtres données en paramètres.

