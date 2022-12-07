TODO
make an object of the parser state

muse take in input a hex dup + offset and interpretation of the packets
to convert a pcap file : `tshark -Q -x -r <.pcap> > <out.txtcap>`
and remove the rassembled tcp part

## Instalation

Nous avons fait le choix de n'utiliser aucune dépendence pour le projet hormis les dépendances nécessaires, tel que l'interpréteur et le typages.

Pour executer le cli, installez `node` https://nodejs.org/en/ (ou avec pour packet manager)

Installer les modules avec `npm i` (pas besoin de fix les vulnérabilités)

ensuite pour executer le code, entrez dans le dossier  `/src/` et executer la commande suivantes avec la syntaxe suivante `<npx> ts-node cli.ts <a/f> <input file> <output file>`.

utilisez `npx` dans le cas où `ts-node` n'est pas dans le PATH.

A c'est pour l'analyse et F c'est pour le monde affichage avec FLECHE

le fichier d'ouput est optionnel, si il y en a pas ça va print dans le terminal.


PS: ts-node transpile sur le moment le code en javascript ce qui peut s'avérer lent surtout sur des petites machines. Il est possible de *build* le projet en JS pour l'excuter plus rapidement. 

Pour se faire dans le root du projet taper `npm build`. ça va transpiler le code, et une fois cela fait il suffit d'excécuter avec node le fichier `build/cli.js`.

Il y a des fichiers d'exemple à excecuter dans le dossier `src/data/txt`


Le projet à aussi une version web app (WIP), vous pouvez regarder le code dans la [branch web_app](https://github.com/rboudrouss/request_parser/tree/webapp)